'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { calculatePayroll } from '@/lib/salary-calculator';
import { getDaysInMonth, timeHHMMToMinutes, minutesToDecimalHours, getMonthName } from '@/lib/currency-utils';
import { minutesToHHMM } from '@/lib/attendance-processor';
import { getSalarySlipLayoutConfig } from '@/actions/salary-slip-config';
import { getCustomDeductionAmount } from '@/lib/pt-calculator';
import path from 'path';
import type { ActionResult, PayrollSettings, DEFAULT_SETTINGS } from '@/types';

// ============================================================
// Get Payroll Settings
// ============================================================

export async function getPayrollSettings(): Promise<PayrollSettings> {
  const settings = await prisma.payrollSetting.findMany();
  const defaults = {
    standard_working_hours: 8,
    half_day_threshold: 5,
    late_threshold_minutes: 15,
    overtime_after_hours: 8,
    shift_start_time: '09:00',
    shift_end_time: '18:00',
    weekly_off_days: [0],
    lop_calculation_method: 'fixed30' as const,
    lop_based_on: 'gross' as const,
    overtime_rate_per_hour: 100,
    company_name: 'MY PAIN CLINIC GLOBAL',
    company_address: '',
  };

  for (const setting of settings) {
    try {
      if (setting.key in defaults) {
        const key = setting.key as keyof typeof defaults;
        if (typeof defaults[key] === 'number') {
          (defaults as Record<string, unknown>)[key] = parseFloat(setting.value);
        } else if (Array.isArray(defaults[key])) {
          (defaults as Record<string, unknown>)[key] = JSON.parse(setting.value);
        } else {
          (defaults as Record<string, unknown>)[key] = setting.value;
        }
      }
    } catch {
      // Use default if parse fails
    }
  }

  return defaults;
}

// ============================================================
// Save Payroll Settings
// ============================================================

export async function savePayrollSettings(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const entries = Object.fromEntries(formData.entries());

  try {
    for (const [key, value] of Object.entries(entries)) {
      await prisma.payrollSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), category: 'payroll' },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'PayrollSettings',
      newValue: entries,
    });

    revalidatePath('/dashboard/settings');
    return { success: true, message: 'Settings saved successfully' };
  } catch (error) {
    console.error('Save settings error:', error);
    return { success: false, message: 'Failed to save settings' };
  }
}

// ============================================================
// Create Payroll Period
// ============================================================

export async function createPayrollPeriod(month: number, year: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        salaryStructures: {
          where: { isActive: true },
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
    });

    let created = 0;
    let skipped = 0;

    for (const employee of activeEmployees) {
      const existing = await prisma.monthlyPayroll.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: employee.id,
            month,
            year,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const salary = employee.salaryStructures[0];
      if (!salary) {
        skipped++;
        continue;
      }

      await prisma.monthlyPayroll.create({
        data: {
          employeeId: employee.id,
          month,
          year,
          totalDays: getDaysInMonth(month, year),
          basicSalary: salary.basicSalary,
          hra: salary.hra,
          conveyance: salary.conveyance,
          otherAllowance: salary.otherAllowance,
          status: 'DRAFT',
        },
      });

      created++;
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CREATE',
      entity: 'PayrollPeriod',
      newValue: { month, year, created, skipped },
    });

    revalidatePath('/dashboard/payroll');
    return {
      success: true,
      message: `Payroll period created: ${created} employees added, ${skipped} skipped`,
    };
  } catch (error) {
    console.error('Create payroll period error:', error);
    return { success: false, message: 'Failed to create payroll period' };
  }
}

// ============================================================
// Calculate Employee Payroll
// ============================================================

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignore outside request scope
  }
}

export async function calculateEmployeePayrollInternal(payrollId: string): Promise<ActionResult> {
  try {
    const payroll = await prisma.monthlyPayroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: {
          include: {
            salaryStructures: {
              where: { isActive: true },
              take: 1,
            },
            advances: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!payroll) return { success: false, message: 'Payroll record not found' };
    // If payroll is finalized or salary slips are generated, delete existing salary slip record and file on disk
    if (payroll.status === 'FINALIZED' || payroll.status === 'SALARY_SLIP_GENERATED') {
      try {
        const existingSlip = await prisma.salarySlip.findUnique({
          where: { payrollId: payroll.id },
        });
        if (existingSlip) {
          try {
            const fs = await import('fs/promises');
            await fs.unlink(existingSlip.filePath);
          } catch {
            // File might not exist on disk yet, safely ignore
          }
          await prisma.salarySlip.delete({
            where: { id: existingSlip.id },
          });
        }
      } catch (slipCleanupErr) {
        console.warn('Failed to cleanup existing salary slip:', slipCleanupErr);
      }
    }

    const settings = await getPayrollSettings();
    const salary = payroll.employee.salaryStructures[0];
    if (!salary) return { success: false, message: 'No salary structure found' };

    // Get attendance summary for this month
    const startDate = new Date(Date.UTC(payroll.year, payroll.month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(payroll.year, payroll.month, 0, 23, 59, 59, 999));

    const attendanceRecords = await prisma.attendanceDaily.findMany({
      where: {
        employeeId: payroll.employeeId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // Count unpaid leaves with letters (from Leave Management)
    const approvedUnpaidLeaves = await prisma.leave.findMany({
      where: {
        employeeId: payroll.employeeId,
        status: 'APPROVED',
        leaveType: 'UNPAID_LEAVE',
        OR: [
          { fromDate: { lte: endDate }, toDate: { gte: startDate } }
        ]
      }
    });

    let unpaidLeaveDaysWithLetter = 0;
    for (const leave of approvedUnpaidLeaves) {
      const start = new Date(Math.max(leave.fromDate.getTime(), startDate.getTime()));
      const end = new Date(Math.min(leave.toDate.getTime(), endDate.getTime()));
      if (start <= end) {
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        unpaidLeaveDaysWithLetter += diffDays;
      }
    }

    // Count attendance and hours
    let presentDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let weeklyOffs = 0;
    let holidays = 0;
    let missingPunchDays = 0;
    let totalOvertimeMinutes = 0;
    let totalWorkingHours = 0; // Direct decimal sum matching accountant's sheet formula

    let fullPresentDays = 0;
    let halfDayDays = 0;
    let totalFullHoursWorked = 0;
    let totalHalfDayHours = 0;

    const isStrictLateEnabled = (payroll.employee as any).strictLateRule === true;
    const empLateThreshold = Number((payroll.employee as any).lateThresholdMinutes ?? settings.late_threshold_minutes ?? 5);
    let mildLateCount = 0;

    for (const rec of attendanceRecords) {
      const lateMins = Number(rec.lateMinutes || 0);
      let effectiveStatus = rec.status;

      // If late by 30 mins or more on a working day, enforce HALF_DAY penalty when strict rule is enabled
      if (isStrictLateEnabled && (effectiveStatus === 'PRESENT' || effectiveStatus === 'WORK_FROM_HOME' || effectiveStatus === 'ON_DUTY') && lateMins >= 30) {
        effectiveStatus = 'HALF_DAY';
      }

      switch (effectiveStatus) {
        case 'PRESENT':
        case 'WORK_FROM_HOME':
        case 'ON_DUTY':
          fullPresentDays++;
          presentDays++;
          totalFullHoursWorked += Number(rec.workingHours || 0);
          totalWorkingHours += Number(rec.workingHours || 0);
          if (isStrictLateEnabled && lateMins > empLateThreshold && lateMins < 30) {
            mildLateCount++;
          }
          break;
        case 'HALF_DAY':
          halfDayDays++;
          presentDays += 0.5;
          unpaidLeaveDays += 0.5;
          totalHalfDayHours += Number(rec.workingHours || 0);
          totalWorkingHours += Number(rec.workingHours || 0);
          break;
        case 'PAID_LEAVE':
          paidLeaveDays++;
          break;
        case 'UNPAID_LEAVE':
        case 'ABSENT':
          unpaidLeaveDays++;
          break;
        case 'WEEKLY_OFF':
          weeklyOffs++;
          break;
        case 'HOLIDAY':
          holidays++;
          break;
        case 'MISSING_PUNCH':
          missingPunchDays++;
          break;
      }
      totalOvertimeMinutes += timeHHMMToMinutes(Number(rec.overtimeHours));
    }

    totalFullHoursWorked = Math.round(totalFullHoursWorked * 100) / 100;
    totalHalfDayHours = Math.round(totalHalfDayHours * 100) / 100;
    totalWorkingHours = Math.round(totalWorkingHours * 100) / 100;

    // Apply 3-late threshold rule (every 3 mild late arrivals = 0.5 day LOP penalty) if enabled
    const latePenaltyLOP = isStrictLateEnabled ? Math.floor(mildLateCount / 3) * 0.5 : 0;
    if (latePenaltyLOP > 0) {
      unpaidLeaveDays += latePenaltyLOP;
      presentDays = Math.max(0, presentDays - latePenaltyLOP);
    }
    
    const empStandardWorkingHours = Number(payroll.employee.standardWorkingHours || 9);
    // Expected hours calculated strictly for full proper present days * shift hours (excluding half days)
    const expectedPresentHours = fullPresentDays * empStandardWorkingHours;
    
    const avgWorkingHours = presentDays > 0 ? (totalWorkingHours / presentDays) : 0;
    const rawOvertimeHoursDecimal = minutesToDecimalHours(totalOvertimeMinutes);
    const totalOvertimeHoursDecimal = (totalFullHoursWorked >= expectedPresentHours && avgWorkingHours > 9.10) 
      ? rawOvertimeHoursDecimal 
      : 0;

    // ============================================================
    // Sandwich Rule:
    // If an employee takes full leave on Saturday AND Monday surrounding Sunday,
    // Sunday (Weekly Off) becomes an unpaid sandwich leave (LOP).
    // IMPORTANT: MISSING_PUNCH is NOT considered a leave/absent day.
    // ============================================================
    const EXPLICIT_LEAVE_STATUSES = new Set(['ABSENT', 'UNPAID_LEAVE']);
    const statusByDate = new Map<string, string>();
    for (const rec of attendanceRecords) {
      const key = new Date(rec.date).toISOString().split('T')[0];
      statusByDate.set(key, rec.status);
    }

    let sandwichedDays = 0;
    for (const rec of attendanceRecords) {
      if (rec.status !== 'WEEKLY_OFF') continue;

      const date = new Date(rec.date);
      const prevDate = new Date(date); prevDate.setUTCDate(date.getUTCDate() - 1); // Saturday
      const nextDate = new Date(date); nextDate.setUTCDate(date.getUTCDate() + 1); // Monday

      const prevKey = prevDate.toISOString().split('T')[0];
      const nextKey = nextDate.toISOString().split('T')[0];

      const prevStatus = statusByDate.get(prevKey);
      const nextStatus = statusByDate.get(nextKey);

      // Only if both Saturday and Monday are explicit leaves (ignoring missing punch, half day, present, etc.)
      if (prevStatus && nextStatus && EXPLICIT_LEAVE_STATUSES.has(prevStatus) && EXPLICIT_LEAVE_STATUSES.has(nextStatus)) {
        sandwichedDays++;
        weeklyOffs--; // Converted to LOP
      }
    }

    // Calculate advance deductions
    let advanceDeduction = 0;
    let loanDeduction = 0;
    for (const advance of payroll.employee.advances) {
      const remaining = Number(advance.remainingAmount);
      const installment = Math.min(Number(advance.monthlyInstallment), remaining);
      if (advance.type === 'ADVANCE') advanceDeduction += installment;
      else loanDeduction += installment;
    }

    // Use salary calculator
    // Fetch salary slip layout config to include custom deductions (e.g. Professional Tax)
    // so that the stored netSalary exactly matches what appears on the salary slip PDF.
    const layoutConfig = await getSalarySlipLayoutConfig();
    const grossSalaryBase = Number(salary.basicSalary) + Number(salary.hra) + Number(salary.conveyance) + Number(salary.otherAllowance);
    const customDeductionsTotal = (layoutConfig.customDeductions || [])
      .reduce((sum: number, d: any) => sum + getCustomDeductionAmount(d, payroll.employee.gender, grossSalaryBase, payroll.month), 0);

    // Calculate joining salary hold (15 days) if applicable
    let holdSalaryDeduction = Number((payroll as any).holdSalaryDeduction || 0);
    const empHoldSetting = (payroll.employee as any).holdSalaryOnJoining;
    const joiningDate = payroll.employee.joiningDate ? new Date(payroll.employee.joiningDate) : null;
    const isJoiningMonth = joiningDate
      ? (joiningDate.getUTCFullYear() === payroll.year && (joiningDate.getUTCMonth() + 1) === payroll.month)
      : false;

    if (holdSalaryDeduction === 0 && (empHoldSetting || isJoiningMonth)) {
      const perDaySalary = Number(salary.basicSalary) / 30;
      holdSalaryDeduction = Math.round(15 * perDaySalary * 100) / 100;
    }

    // Only include overtime if the employee is marked as Overtime Eligible
    const isOvertimeEligible = Boolean(salary.overtimeEligible);

    const result = calculatePayroll({
      salaryStructure: {
        basicSalary: Number(salary.basicSalary),
        hra: Number(salary.hra),
        conveyance: Number(salary.conveyance),
        otherAllowance: Number(salary.otherAllowance),
      },
      month: payroll.month,
      year: payroll.year,
      totalDays: getDaysInMonth(payroll.month, payroll.year),
      presentDays,
      actualPresentDays: fullPresentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      weeklyOffs,
      holidays,
      overtimeHours: isOvertimeEligible ? totalOvertimeHoursDecimal : 0,
      totalWorkingHours,
      standardWorkingHours: empStandardWorkingHours,
      incentiveAmount: Number(payroll.incentiveAmount),
      bonusAmount: Number(payroll.bonusAmount),
      commissionAmount: Number(payroll.commissionAmount),
      advanceDeduction,
      loanDeduction,
      holdSalaryDeduction,
      otherDeduction: Number(payroll.otherDeduction || 0),
      pfDeduction: Number(payroll.pfDeduction),
      missingPunchDays,
      lopCalculationMethod: settings.lop_calculation_method,
      overtimeRatePerHour: settings.overtime_rate_per_hour,
      lopBasedOn: settings.lop_based_on,
      suddenLeavePenalty: false, // Disabled as per clinic accountant manual formula
      unpaidLeaveDaysWithLetter: Math.min(unpaidLeaveDays, unpaidLeaveDaysWithLetter),
      paidLeaveAdjustment: Number((payroll as any).paidLeaveAdjustment || 0),
    });

    // Update payroll record
    await (prisma.monthlyPayroll.update as any)({
      where: { id: payrollId },
      data: {
        presentDays: result.paidDays,
        paidLeaveDays: result.paidLeaveDays,
        unpaidLeaveDays: result.unpaidLeaveDays,
        lopDays: result.lopDays,
        weeklyOffs: result.weeklyOffs,
        holidays: result.holidays,
        overtimeHours: result.overtimeAmount > 0 ? totalOvertimeHoursDecimal : 0,
        shortWorkingHours: result.shortWorkingHours,
        totalWorkingHours,
        sandwichedDays,
        missingPunchDays,
        basicSalary: result.basicSalary,
        hra: result.hra,
        conveyance: result.conveyance,
        otherAllowance: result.otherAllowance,
        overtimeAmount: result.overtimeAmount,
        grossSalary: result.grossSalary,
        lopDeduction: result.lopDeduction,
        shortHoursDeduction: (payroll as any).isShortHoursCustomized
          ? Number((payroll as any).shortHoursDeduction || 0)
          : ((payroll as any).waiveShortHoursDeduction ? 0 : result.shortHoursDeduction),
        holdSalaryDeduction: result.holdSalaryDeduction,
        advanceDeduction: result.advanceDeduction,
        loanDeduction: result.loanDeduction,
        otherDeduction: Number(payroll.otherDeduction || 0),
        totalDeduction: Math.round(((result.totalDeduction - result.shortHoursDeduction + ((payroll as any).isShortHoursCustomized ? Number((payroll as any).shortHoursDeduction || 0) : ((payroll as any).waiveShortHoursDeduction ? 0 : result.shortHoursDeduction))) + customDeductionsTotal) * 100) / 100,
        netSalary: Math.max(0, Math.round((result.grossSalary - ((result.totalDeduction - result.shortHoursDeduction + ((payroll as any).isShortHoursCustomized ? Number((payroll as any).shortHoursDeduction || 0) : ((payroll as any).waiveShortHoursDeduction ? 0 : result.shortHoursDeduction))) + customDeductionsTotal)) * 100) / 100),
        status: 'CALCULATED',
      },
    });

    // Update advance deductions
    for (const advance of payroll.employee.advances) {
      const installment = Math.min(
        Number(advance.monthlyInstallment),
        Number(advance.remainingAmount)
      );
      const newDeducted = Number(advance.deductedAmount) + installment;
      const newRemaining = Number(advance.totalAmount) - newDeducted;

      await prisma.employeeAdvance.update({
        where: { id: advance.id },
        data: {
          deductedAmount: newDeducted,
          remainingAmount: Math.max(0, newRemaining),
          status: newRemaining <= 0 ? 'COMPLETED' : 'ACTIVE',
        },
      });
    }

    safeRevalidatePath('/dashboard/payroll');
    return { success: true, message: 'Payroll calculated successfully' };
  } catch (error) {
    console.error('Calculate payroll error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to calculate payroll: ${msg}` };
  }
}

export async function calculateEmployeePayroll(payrollId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };
  return calculateEmployeePayrollInternal(payrollId);
}

// ============================================================
// Calculate All Payrolls for a Month
// ============================================================

export async function calculateAllPayrollsInternal(month: number, year: number): Promise<ActionResult> {
  try {
    const payrolls = await prisma.monthlyPayroll.findMany({
      where: {
        month,
        year,
      },
    });

    let calculated = 0;
    let errors = 0;

    for (const payroll of payrolls) {
      const result = await calculateEmployeePayrollInternal(payroll.id);
      if (result.success) calculated++;
      else errors++;
    }

    return {
      success: true,
      message: `${calculated} payrolls calculated, ${errors} errors`,
    };
  } catch (error) {
    console.error('Calculate all payrolls error:', error);
    return { success: false, message: 'Failed to calculate payrolls' };
  }
}

export async function calculateAllPayrolls(month: number, year: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };
  return calculateAllPayrollsInternal(month, year);
}

// ============================================================
// Approve / Finalize Payroll
// ============================================================

export async function approvePayroll(payrollId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.monthlyPayroll.update({
      where: { id: payrollId },
      data: {
        status: 'APPROVED',
        approvedBy: session.user.name,
        approvedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'APPROVE',
      entity: 'Payroll',
      entityId: payrollId,
    });

    revalidatePath('/dashboard/payroll');
    return { success: true, message: 'Payroll approved' };
  } catch (error) {
    console.error('Approve payroll error:', error);
    return { success: false, message: 'Failed to approve payroll' };
  }
}

export async function finalizePayroll(payrollId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.monthlyPayroll.update({
      where: { id: payrollId },
      data: {
        status: 'FINALIZED',
        finalizedBy: session.user.name,
        finalizedAt: new Date(),
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'FINALIZE',
      entity: 'Payroll',
      entityId: payrollId,
    });

    revalidatePath('/dashboard/payroll');
    return { success: true, message: 'Payroll finalized' };
  } catch (error) {
    console.error('Finalize payroll error:', error);
    return { success: false, message: 'Failed to finalize payroll' };
  }
}

export async function reopenPayroll(payrollId: string, reason: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    return { success: false, message: 'Only Super Admin can reopen finalized payroll' };
  }

  if (!reason) return { success: false, message: 'Reason is required to reopen payroll' };

  try {
    const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: payrollId } });
    if (!payroll) return { success: false, message: 'Payroll not found' };

    await prisma.monthlyPayroll.update({
      where: { id: payrollId },
      data: { status: 'DRAFT' },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'REOPEN',
      entity: 'Payroll',
      entityId: payrollId,
      oldValue: { status: payroll.status },
      newValue: { status: 'DRAFT' },
      reason,
    });

    revalidatePath('/dashboard/payroll');
    return { success: true, message: 'Payroll reopened' };
  } catch (error) {
    console.error('Reopen payroll error:', error);
    return { success: false, message: 'Failed to reopen payroll' };
  }
}

// ============================================================
// Update Payroll Extras (incentive, deductions)
// ============================================================

export async function updatePayrollExtras(
  payrollId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: payrollId } });
    if (!payroll) return { success: false, message: 'Payroll not found' };
    if (payroll.status === 'FINALIZED' || payroll.status === 'SALARY_SLIP_GENERATED') {
      return { success: false, message: 'Cannot modify finalized payroll' };
    }

    const raw = Object.fromEntries(formData.entries());

    await prisma.monthlyPayroll.update({
      where: { id: payrollId },
      data: {
        incentiveAmount: parseFloat(raw.incentiveAmount as string) || 0,
        incentiveReason: raw.incentiveReason as string || null,
        bonusAmount: parseFloat(raw.bonusAmount as string) || 0,
        bonusReason: raw.bonusReason as string || null,
        otherDeduction: parseFloat(raw.otherDeduction as string) || 0,
        otherDeductionNote: raw.otherDeductionNote as string || null,
        commissionAmount: parseFloat(raw.commissionAmount as string) || 0,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'PayrollExtras',
      entityId: payrollId,
      newValue: raw,
    });

    revalidatePath('/dashboard/payroll');
    return { success: true, message: 'Payroll extras updated. Recalculate to apply changes.' };
  } catch (error) {
    console.error('Update payroll extras error:', error);
    return { success: false, message: 'Failed to update payroll extras' };
  }
}

// ============================================================
// Update Payroll Deductions
// ============================================================

export async function updatePayrollDeductions(
  payrollId: string,
  data: {
    otherDeduction: number;
    otherDeductionNote?: string;
    advanceDeduction: number;
    pfDeduction: number;
    paidLeaveAdjustment?: number;
    holdSalaryDeduction?: number;
    encashRemainingLeaves?: boolean;
    waiveShortHoursDeduction?: boolean;
    shortHoursDeduction?: number;
    isShortHoursCustomized?: boolean;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: payrollId } });
    if (!payroll) return { success: false, message: 'Payroll record not found' };

    const paidLeaveAdjustment = Math.max(0, Number(data.paidLeaveAdjustment || 0));
    const holdSalaryDeduction = data.holdSalaryDeduction !== undefined ? Math.max(0, Number(data.holdSalaryDeduction)) : Number((payroll as any).holdSalaryDeduction || 0);
    const waiveShortHoursDeduction = data.waiveShortHoursDeduction !== undefined ? Boolean(data.waiveShortHoursDeduction) : Boolean((payroll as any).waiveShortHoursDeduction || false);
    const isShortHoursCustomized = data.isShortHoursCustomized !== undefined ? Boolean(data.isShortHoursCustomized) : Boolean((payroll as any).isShortHoursCustomized || false);
    const shortHoursDeduction = data.shortHoursDeduction !== undefined ? Math.max(0, Number(data.shortHoursDeduction)) : Number((payroll as any).shortHoursDeduction || 0);
    const loanDeduction = Number(payroll.loanDeduction || 0);
    const otherDeduction = Math.max(0, Number(data.otherDeduction || 0));
    const advanceDeduction = Math.max(0, Number(data.advanceDeduction || 0));
    const pfDeduction = Math.max(0, Number(data.pfDeduction || 0));

    // Handle 1-Year Paid Leave Encashment if requested
    if (data.encashRemainingLeaves) {
      const leaveInfo = await getPaidLeaveBalance(payroll.employeeId, payroll.year, payroll.month, payrollId);
      if (leaveInfo.is1YearCompleted && leaveInfo.encashmentAmount > 0) {
        await prisma.monthlyPayroll.update({
          where: { id: payrollId },
          data: {
            bonusAmount: leaveInfo.encashmentAmount,
            bonusReason: `1-Year Paid Leave Encashment (${leaveInfo.remainingAnnual} days)`,
          },
        });
      }
    }

    // Save paidLeaveAdjustment, holdSalaryDeduction & other deduction edits
    await (prisma.monthlyPayroll.update as any)({
      where: { id: payrollId },
      data: {
        paidLeaveAdjustment,
        holdSalaryDeduction,
        waiveShortHoursDeduction,
        shortHoursDeduction,
        isShortHoursCustomized,
        otherDeduction,
        otherDeductionNote: data.otherDeductionNote || null,
        advanceDeduction,
        pfDeduction,
      },
    });

    // Trigger recalculation so the new paidLeaveAdjustment is reflected in lopDeduction/totalDeduction/netSalary
    const recalcResult = await calculateEmployeePayrollInternal(payrollId);
    if (!recalcResult.success) {
      return { success: false, message: 'Saved but recalculation failed: ' + recalcResult.message };
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'PayrollDeductions',
      entityId: payrollId,
      newValue: { paidLeaveAdjustment, otherDeduction, advanceDeduction, pfDeduction },
    });

    revalidatePath('/dashboard/payroll');
    return { success: true, message: 'Deductions updated and payroll recalculated' };
  } catch (error) {
    console.error('Update payroll deductions error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to update deductions: ${msg}` };
  }
}

// ============================================================
// Paid Leave Balance — 6 per year, 1 per 2-month period
// ============================================================

export interface PaidLeaveBalanceInfo {
  annualTotal: number;        // Total leaves for current block (0 for M1-6, 3 for M7-12, 6 after 1 yr)
  usedThisYear: number;       // sum of paidLeaveAdjustment for current block/year (excluding current payroll)
  remainingAnnual: number;    // annualTotal - usedThisYear
  usedInPeriod: number;       // leaves used in current block
  usedInFirst6Months: number; // paid leaves used during first 6 months from joiningDate
  tenureMonths: number;       // completed months since joiningDate
  blockNumber: number;        // 0 (months 1-6), 1 (months 7-12), 2 (1+ years)
  unlocked6MonthBonus: boolean; // true if tenureMonths >= 6
  is1YearCompleted: boolean;   // true if tenureMonths >= 12
  encashmentAmount: number;    // remaining unused leaves (up to 6) * (basicSalary / 30)
  maxForThisMonth: number;    // max leaves allowed in current month (0 in M1-6, up to 3 in M7-12, up to 6 after 1 yr)
  periodLabel: string;        // e.g. "Months 1–6 (Probation)", "Months 7–12 (Block 1)", "Year 1+ Completed"
}

export async function getPaidLeaveBalance(
  employeeId: string,
  year: number,
  month: number,
  currentPayrollId: string
): Promise<PaidLeaveBalanceInfo> {
  // Fetch employee details (joiningDate and basicSalary)
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: {
      joiningDate: true,
      salaryStructures: {
        where: { isActive: true },
        take: 1,
        select: { basicSalary: true },
      },
    },
  });

  const basicSalary = Number(employee?.salaryStructures[0]?.basicSalary || 0);
  const joiningDate = employee?.joiningDate ? new Date(employee.joiningDate) : null;

  // Fetch all payroll records for this employee across years
  const allPayrolls = await (prisma.monthlyPayroll.findMany as any)({
    where: { employeeId },
    select: { id: true, month: true, year: true, paidLeaveAdjustment: true },
  });

  let tenureMonths = 12; // default to 12 if joiningDate is missing
  let usedInFirst6Months = 0;

  if (joiningDate) {
    const jYear = joiningDate.getUTCFullYear();
    const jMonth = joiningDate.getUTCMonth() + 1; // 1-12

    // Completed tenure months up to target payroll period (year, month)
    tenureMonths = (year - jYear) * 12 + (month - jMonth);
    if (tenureMonths < 0) tenureMonths = 0;

    const startMonthAbs = jYear * 12 + jMonth;
    const first6EndAbs = startMonthAbs + 5; // 6 months inclusive (e.g. Month 1 to 6)

    usedInFirst6Months = allPayrolls
      .filter((p: any) => {
        if (p.id === currentPayrollId) return false;
        const pAbs = p.year * 12 + p.month;
        return pAbs >= startMonthAbs && pAbs <= first6EndAbs;
      })
      .reduce((sum: number, p: any) => sum + Number(p.paidLeaveAdjustment || 0), 0);
  }

  let blockNumber = 0;
  let annualTotal = 0;
  let periodLabel = 'Months 1–6 (Probation)';
  let maxForThisMonth = 0;
  let usedThisYear = 0;

  if (tenureMonths < 6) {
    // Block 0: Probation (Months 1–6) — 0 leaves available
    blockNumber = 0;
    annualTotal = 0;
    periodLabel = 'Months 1–6 (Probation)';
    usedThisYear = usedInFirst6Months;
    maxForThisMonth = 0;
  } else if (tenureMonths >= 6 && tenureMonths < 12) {
    // Block 1: Months 7–12 — 3 continuous leaves available together
    blockNumber = 1;
    annualTotal = 3;
    periodLabel = 'Months 7–12 (Block 1)';

    const jYear = joiningDate ? joiningDate.getUTCFullYear() : year;
    const jMonth = joiningDate ? joiningDate.getUTCMonth() + 1 : 1;
    const block1StartAbs = jYear * 12 + jMonth + 6;
    const block1EndAbs = jYear * 12 + jMonth + 11;

    const usedInBlock1 = allPayrolls
      .filter((p: any) => {
        if (p.id === currentPayrollId) return false;
        const pAbs = p.year * 12 + p.month;
        return pAbs >= block1StartAbs && pAbs <= block1EndAbs;
      })
      .reduce((sum: number, p: any) => sum + Number(p.paidLeaveAdjustment || 0), 0);

    usedThisYear = usedInBlock1;
    maxForThisMonth = Math.max(0, 3 - usedInBlock1);
  } else {
    // Block 2+: 1+ Year Completed — 6 total leaves per year available (3 + 3)
    blockNumber = 2;
    annualTotal = 6;
    periodLabel = 'Year 1+ Completed';

    const empYearIndex = Math.floor(tenureMonths / 12);
    const jYear = joiningDate ? joiningDate.getUTCFullYear() : year;
    const jMonth = joiningDate ? joiningDate.getUTCMonth() + 1 : 1;

    const currentEmpYearStartAbs = jYear * 12 + jMonth + empYearIndex * 12;
    const currentEmpYearEndAbs = currentEmpYearStartAbs + 11;

    const usedInEmpYear = allPayrolls
      .filter((p: any) => {
        if (p.id === currentPayrollId) return false;
        const pAbs = p.year * 12 + p.month;
        return pAbs >= currentEmpYearStartAbs && pAbs <= currentEmpYearEndAbs;
      })
      .reduce((sum: number, p: any) => sum + Number(p.paidLeaveAdjustment || 0), 0);

    usedThisYear = usedInEmpYear;
    maxForThisMonth = Math.max(0, 6 - usedInEmpYear);
  }

  const unlocked6MonthBonus = tenureMonths >= 6;
  const is1YearCompleted = tenureMonths >= 12;
  const remainingAnnual = Math.max(0, annualTotal - usedThisYear);

  // Rule: 1-Year Completed -> Remaining paid leave value (up to 6 days) encashed to salary
  const perDaySalary = basicSalary > 0 ? (basicSalary / 30) : 0;
  const encashmentAmount = is1YearCompleted && remainingAnnual > 0
    ? Math.round(remainingAnnual * perDaySalary * 100) / 100
    : 0;

  return {
    annualTotal,
    usedThisYear,
    remainingAnnual,
    usedInPeriod: usedThisYear,
    usedInFirst6Months,
    tenureMonths,
    blockNumber,
    unlocked6MonthBonus,
    is1YearCompleted,
    encashmentAmount,
    maxForThisMonth,
    periodLabel,
  };
}

// ============================================================
// Get Payroll Data
// ============================================================

export async function getPayrollData(month: number, year: number) {
  const payrolls = await prisma.monthlyPayroll.findMany({
    where: { month, year },
    include: {
      employee: {
        select: { employeeId: true, name: true, designation: true, department: true, joiningDate: true },
      },
      salarySlip: true,
    },
    orderBy: { employee: { name: 'asc' } },
  });

  // Dashboard stats
  const stats = {
    totalEmployees: payrolls.length,
    processedEmployees: payrolls.filter((p: { status: string }) => p.status !== 'DRAFT').length,
    pendingEmployees: payrolls.filter((p: { status: string }) => p.status === 'DRAFT').length,
    grossSalary: payrolls.reduce((sum: number, p: { grossSalary: unknown }) => sum + Number(p.grossSalary), 0),
    totalDeductions: payrolls.reduce((sum: number, p: { totalDeduction: unknown }) => sum + Number(p.totalDeduction), 0),
    netSalary: payrolls.reduce((sum: number, p: { netSalary: unknown }) => sum + Number(p.netSalary), 0),
    totalIncentives: payrolls.reduce((sum: number, p: { incentiveAmount: unknown }) => sum + Number(p.incentiveAmount), 0),
    totalOvertime: payrolls.reduce((sum: number, p: { overtimeAmount: unknown }) => sum + Number(p.overtimeAmount), 0),
    totalLOP: payrolls.reduce((sum: number, p: { lopDeduction: unknown }) => sum + Number(p.lopDeduction), 0),
    totalAdvances: payrolls.reduce((sum: number, p: { advanceDeduction: unknown; loanDeduction: unknown }) => sum + Number(p.advanceDeduction) + Number(p.loanDeduction), 0),
  };

  return { payrolls, stats };
}

export async function getPayrollById(id: string) {
  return prisma.monthlyPayroll.findUnique({
    where: { id },
    include: {
      employee: {
        include: {
          salaryStructures: { where: { isActive: true }, take: 1 },
        },
      },
      salarySlip: true,
    },
  });
}

// ============================================================
// Approve All Payrolls
// ============================================================

export async function approveAllPayrolls(month: number, year: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const result = await prisma.monthlyPayroll.updateMany({
      where: { month, year, status: { in: ['DRAFT', 'CALCULATED'] } },
      data: {
        status: 'APPROVED',
        approvedBy: session.user.name,
        approvedAt: new Date(),
      },
    });

    revalidatePath('/dashboard/payroll');
    return {
      success: true,
      message: result.count > 0
        ? `${result.count} payrolls approved successfully`
        : 'All payrolls for this month are already approved!',
    };
  } catch (error) {
    console.error('Approve all error:', error);
    return { success: false, message: 'Failed to approve payrolls' };
  }
}

// ============================================================
// Generate All Salary Slips for a Month
// ============================================================

export async function generateAllSalarySlips(month: number, year: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    // 1. Finalize all payrolls for this month
    await prisma.monthlyPayroll.updateMany({
      where: { month, year, status: { in: ['DRAFT', 'CALCULATED', 'APPROVED'] } },
      data: {
        status: 'FINALIZED',
        finalizedBy: session.user.name,
        finalizedAt: new Date(),
      },
    });

    // 2. Fetch all payrolls for this month
    const finalizedPayrolls = await prisma.monthlyPayroll.findMany({
      where: { month, year },
      include: { employee: true },
    });

    let generatedCount = 0;
    const monthName = getMonthName(month);
    for (const p of finalizedPayrolls) {
      const safeName = p.employee.name
        .replace(/[/\\?%*:|"<>]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_');
      const fileName = `${p.employee.employeeId}_${safeName}_${monthName}_${p.year}.pdf`;
      const storagePath = path.join(process.cwd(), 'salary-slips', String(p.year), monthName);
      const filePath = path.join(storagePath, fileName);

      await prisma.salarySlip.upsert({
        where: { payrollId: p.id },
        update: {
          generatedBy: session.user.name,
          generatedAt: new Date(),
          fileName,
          filePath,
        },
        create: {
          payrollId: p.id,
          employeeId: p.employeeId,
          month: p.month,
          year: p.year,
          fileName,
          filePath,
          generatedBy: session.user.name,
          generatedAt: new Date(),
        },
      });

      await prisma.monthlyPayroll.update({
        where: { id: p.id },
        data: { status: 'SALARY_SLIP_GENERATED' },
      });

      generatedCount++;
    }

    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard/salary-slips');
    return { success: true, message: `Successfully generated ${generatedCount} salary slips!` };
  } catch (error) {
    console.error('Generate all slips error:', error);
    return { success: false, message: 'Failed to generate salary slips' };
  }
}
