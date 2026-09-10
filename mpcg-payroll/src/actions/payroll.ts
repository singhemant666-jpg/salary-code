'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { calculatePayroll } from '@/lib/salary-calculator';
import { getDaysInMonth, timeHHMMToMinutes, minutesToDecimalHours, getMonthName } from '@/lib/currency-utils';
import { minutesToHHMM } from '@/lib/attendance-processor';
import { getSalarySlipLayoutConfig } from '@/actions/salary-slip-config';
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

export async function calculateEmployeePayroll(payrollId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

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

    for (const rec of attendanceRecords) {
      switch (rec.status) {
        case 'PRESENT':
        case 'WORK_FROM_HOME':
        case 'ON_DUTY':
          presentDays++;
          totalWorkingHours += Number(rec.workingHours || 0);
          break;
        case 'HALF_DAY':
          presentDays += 0.5;
          totalWorkingHours += Number(rec.workingHours || 0);
          break;
        case 'PAID_LEAVE':
          paidLeaveDays++;
          break;
        case 'UNPAID_LEAVE':
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

    totalWorkingHours = Math.round(totalWorkingHours * 100) / 100;
    const empStandardWorkingHours = Number(payroll.employee.standardWorkingHours || 9);
    const expectedPresentHours = presentDays * empStandardWorkingHours;
    const rawOvertimeHoursDecimal = minutesToDecimalHours(totalOvertimeMinutes);
    const totalOvertimeHoursDecimal = totalWorkingHours < expectedPresentHours ? 0 : rawOvertimeHoursDecimal;

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
    const customDeductionsTotal = (layoutConfig.customDeductions || [])
      .filter((d: any) => d.enabled && Number(d.defaultValue || 0) > 0)
      .reduce((sum: number, d: any) => sum + Number(d.defaultValue || 0), 0);

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
        shortHoursDeduction: result.shortHoursDeduction,
        holdSalaryDeduction: result.holdSalaryDeduction,
        advanceDeduction: result.advanceDeduction,
        loanDeduction: result.loanDeduction,
        otherDeduction: Number(payroll.otherDeduction || 0),
        totalDeduction: result.totalDeduction,
        netSalary: result.netSalary,
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

    revalidatePath('/dashboard/payroll');
    return { success: true, message: 'Payroll calculated successfully' };
  } catch (error) {
    console.error('Calculate payroll error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to calculate payroll: ${msg}` };
  }
}

// ============================================================
// Calculate All Payrolls for a Month
// ============================================================

export async function calculateAllPayrolls(month: number, year: number): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

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
      const result = await calculateEmployeePayroll(payroll.id);
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
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: payrollId } });
    if (!payroll) return { success: false, message: 'Payroll record not found' };

    const paidLeaveAdjustment = Math.max(0, Number(data.paidLeaveAdjustment || 0));
    const holdSalaryDeduction = data.holdSalaryDeduction !== undefined ? Math.max(0, Number(data.holdSalaryDeduction)) : Number((payroll as any).holdSalaryDeduction || 0);
    const shortHoursDeduction = Number((payroll as any).shortHoursDeduction || 0);
    const loanDeduction = Number(payroll.loanDeduction || 0);
    const otherDeduction = Math.max(0, Number(data.otherDeduction || 0));
    const advanceDeduction = Math.max(0, Number(data.advanceDeduction || 0));
    const pfDeduction = Math.max(0, Number(data.pfDeduction || 0));

    // Save paidLeaveAdjustment, holdSalaryDeduction & other deduction edits
    await (prisma.monthlyPayroll.update as any)({
      where: { id: payrollId },
      data: {
        paidLeaveAdjustment,
        holdSalaryDeduction,
        otherDeduction,
        otherDeductionNote: data.otherDeductionNote || null,
        advanceDeduction,
        pfDeduction,
      },
    });

    // Trigger recalculation so the new paidLeaveAdjustment is reflected in lopDeduction/totalDeduction/netSalary
    const recalcResult = await calculateEmployeePayroll(payrollId);
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
    return { success: false, message: 'Failed to update deductions' };
  }
}

// ============================================================
// Paid Leave Balance — 6 per year, 1 per 2-month period
// ============================================================

export interface PaidLeaveBalanceInfo {
  annualTotal: number;        // 6
  usedThisYear: number;       // sum of paidLeaveAdjustment for this year (excluding current payroll)
  remainingAnnual: number;    // annualTotal - usedThisYear
  usedInPeriod: number;       // used in the current 2-month window (excluding current payroll)
  maxForThisMonth: number;    // effective max: 0 or 1, capped by annual remaining
  periodLabel: string;        // e.g. "Jul-Aug"
}

export async function getPaidLeaveBalance(
  employeeId: string,
  year: number,
  month: number,
  currentPayrollId: string
): Promise<PaidLeaveBalanceInfo> {
  const ANNUAL_LEAVES = 6;

  // 2-month period windows: Jan-Feb(1-2), Mar-Apr(3-4), May-Jun(5-6), Jul-Aug(7-8), Sep-Oct(9-10), Nov-Dec(11-12)
  const periodStart = Math.floor((month - 1) / 2) * 2 + 1;
  const periodEnd = periodStart + 1;

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periodLabel = `${monthNames[periodStart]}-${monthNames[periodEnd]}`;

  // Fetch all payroll records for this employee this year
  const yearPayrolls = await (prisma.monthlyPayroll.findMany as any)({
    where: { employeeId, year },
    select: { id: true, month: true, paidLeaveAdjustment: true },
  });

  // Sum used this year (exclude the current payroll being edited)
  const usedThisYear = yearPayrolls
    .filter((p: any) => p.id !== currentPayrollId)
    .reduce((sum: number, p: any) => sum + Number(p.paidLeaveAdjustment || 0), 0);

  // Sum used in the current 2-month window (excluding current)
  const usedInPeriod = yearPayrolls
    .filter((p: any) => p.id !== currentPayrollId && (p.month === periodStart || p.month === periodEnd))
    .reduce((sum: number, p: any) => sum + Number(p.paidLeaveAdjustment || 0), 0);

  const remainingAnnual = ANNUAL_LEAVES - usedThisYear;

  // In a given 2-month period, max 1 leave. If already used ≥1 this period, no more.
  const periodAllowance = usedInPeriod >= 1 ? 0 : 1;
  const maxForThisMonth = Math.min(periodAllowance, Math.max(0, remainingAnnual));

  return {
    annualTotal: ANNUAL_LEAVES,
    usedThisYear,
    remainingAnnual,
    usedInPeriod,
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
        select: { employeeId: true, name: true, designation: true, department: true },
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
      const safeName = p.employee.name.replace(/\s+/g, '_');
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
