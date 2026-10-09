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
import { isEmployeeSandwichRuleEnabled } from '@/actions/employees';
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
    late_allowed_grace_count: 4,
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

export async function calculateEmployeePayrollInternal(
  payrollId: string,
  overrides?: {
    advanceDeduction?: number;
    loanDeduction?: number;
  }
): Promise<ActionResult> {
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

    // Get holidays for the month
    const monthHolidays = await prisma.holiday.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { date: true, name: true },
    });
    const holidayDateSet = new Set(
      monthHolidays.map(h => new Date(h.date).toISOString().split('T')[0])
    );
    const weeklyOffSet = new Set(settings.weekly_off_days || [0]);

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
      for (let curr = new Date(start); curr <= end; curr.setDate(curr.getDate() + 1)) {
        const currStr = curr.toISOString().split('T')[0];
        const currDow = curr.getUTCDay();
        // Exclude holidays and weekly offs from unpaid leave letter days
        if (!holidayDateSet.has(currStr) && !weeklyOffSet.has(currDow)) {
          unpaidLeaveDaysWithLetter++;
        }
      }
    }

    // Count attendance and hours
    // FIX: Use minute-based accumulation instead of broken HH.MM decimal addition.
    // workingHours is stored in HH.MM format (e.g., 8.59 = 8h 59m, NOT 8.59 decimal hours).
    // Directly adding these gives wrong results (8.59 + 8.59 = 17.18, but correct is 17h58m).
    // Solution: convert each day's HH.MM to minutes, sum minutes, then convert to true decimal hours.
    let presentDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let weeklyOffs = 0;
    let holidays = 0;
    let missingPunchDays = 0;
    let totalOvertimeMinutes = 0;
    let totalWorkingMinutes = 0;       // Accumulated in MINUTES (correct base-60 math)
    let totalFullWorkingMinutes = 0;   // Only full-present days (excludes half days)
    let totalHalfDayMinutes = 0;       // Only half-day hours

    let fullPresentDays = 0;
    let halfDayDays = 0;

    const isStrictLateEnabled = (payroll.employee as any).strictLateRule === true;
    const empLateThreshold = Number((payroll.employee as any).lateThresholdMinutes ?? settings.late_threshold_minutes ?? 15);
    let mildLateCount = 0;

    const joiningDate = (payroll.employee as any).joiningDate ? new Date((payroll.employee as any).joiningDate) : null;
    const joiningDateStr = joiningDate ? joiningDate.toISOString().split('T')[0] : null;

    let notJoinedDays = 0;

    for (const rec of attendanceRecords) {
      const lateMins = Number(rec.lateMinutes || 0);
      const recDate = new Date(rec.date);
      const recDateStr = recDate.toISOString().split('T')[0];
      const isBeforeJoining = joiningDateStr ? recDateStr < joiningDateStr : false;
      const recDayOfWeek = recDate.getUTCDay();
      const isHolidayDate = holidayDateSet.has(recDateStr);
      const isWeeklyOffDate = weeklyOffSet.has(recDayOfWeek);

      let effectiveStatus = isBeforeJoining ? 'NOT_JOINED' : rec.status;
      if (isBeforeJoining) {
        notJoinedDays++;
      }
      // Convert HH.MM to minutes for this record
      const recMinutes = isBeforeJoining ? 0 : timeHHMMToMinutes(Number(rec.workingHours || 0));

      // CRITICAL FIX: Weekly Offs (e.g. Sunday) and Company Holidays are non-working days.
      // If employee has 0 working minutes on these days, they must NEVER be penalized as UNPAID_LEAVE or ABSENT!
      if (!isBeforeJoining && recMinutes === 0) {
        if (isHolidayDate && (effectiveStatus === 'UNPAID_LEAVE' || effectiveStatus === 'ABSENT')) {
          effectiveStatus = 'HOLIDAY';
        } else if (isWeeklyOffDate && (effectiveStatus === 'UNPAID_LEAVE' || effectiveStatus === 'ABSENT')) {
          effectiveStatus = 'WEEKLY_OFF';
        }
      }

      switch (effectiveStatus) {
        case 'NOT_JOINED':
          // Day strictly before employee joined — not counted as absent, not counted as leave
          break;
        case 'PRESENT':
        case 'WORK_FROM_HOME':
        case 'ON_DUTY':
          fullPresentDays++;
          presentDays++;
          totalFullWorkingMinutes += recMinutes;
          totalWorkingMinutes += recMinutes;
          if (isStrictLateEnabled && lateMins > empLateThreshold) {
            mildLateCount++;
          }
          break;
        case 'HALF_DAY':
          halfDayDays++;
          presentDays++;
          totalHalfDayMinutes += recMinutes;
          totalWorkingMinutes += recMinutes;
          if (isStrictLateEnabled && lateMins > empLateThreshold) {
            mildLateCount++;
          }
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
          presentDays++;
          totalWorkingMinutes += recMinutes;
          if (isStrictLateEnabled && lateMins > empLateThreshold) {
            mildLateCount++;
          }
          break;
      }
      totalOvertimeMinutes += timeHHMMToMinutes(Number(rec.overtimeHours));
    }

    // Convert accumulated minutes to TRUE decimal hours for salary calculator
    // e.g., 11998 minutes = 199.967 decimal hours (NOT 199.58 HH.MM format)
    const totalFullHoursWorked = Math.round((totalFullWorkingMinutes / 60) * 100) / 100;
    const totalHalfDayHours = Math.round((totalHalfDayMinutes / 60) * 100) / 100;
    const totalWorkingHours = Math.round((totalWorkingMinutes / 60) * 100) / 100;

    // Also compute HH.MM display value for the stored field (for display purposes)
    const totalWorkingHoursHHMM = minutesToHHMM(totalWorkingMinutes);

    // Apply Late Threshold Rule:
    // First N late arrivals past threshold are allowed as grace (from Payroll Settings late_allowed_grace_count).
    // Late arrivals BEYOND N grace limit are penalized with 0.5 day LOP (half day salary deduction) each.
    const lateGraceLimit = Number(settings.late_allowed_grace_count ?? 4);
    const excessLateCount = Math.max(0, mildLateCount - lateGraceLimit);
    const latePenaltyDays = isStrictLateEnabled ? excessLateCount * 0.5 : 0;
    const perDaySalaryRate = Number(salary.basicSalary) / 30;
    const latePenaltyDeduction = Math.round(latePenaltyDays * perDaySalaryRate * 100) / 100;

    if (latePenaltyDays > 0) {
      unpaidLeaveDays += latePenaltyDays;
    }
    
    const empStandardWorkingHours = Number(payroll.employee.standardWorkingHours || 9);
    // Total physical present days with punch duration (matches Daily Attendance Log Expected Hours)
    const totalPhysicalPresentDays = fullPresentDays + halfDayDays;
    const payablePresentDays = fullPresentDays + halfDayDays + missingPunchDays + weeklyOffs + holidays + paidLeaveDays;
    const expectedPresentHours = totalPhysicalPresentDays * empStandardWorkingHours;
    const expectedPresentMinutes = totalPhysicalPresentDays * empStandardWorkingHours * 60;
    
    const avgWorkingHours = presentDays > 0 ? (totalWorkingHours / presentDays) : 0;
    // Method 1: Net Overtime in exact minutes: Total working minutes minus expected present minutes
    const netOvertimeMinutes = totalWorkingMinutes > expectedPresentMinutes 
      ? totalWorkingMinutes - expectedPresentMinutes 
      : 0;
    const totalOvertimeHoursDecimal = Math.round((netOvertimeMinutes / 60) * 100) / 100;

    // ============================================================
    // Sandwich Rule:
    // If an employee takes unapproved leave (ABSENT / UNPAID_LEAVE) immediately
    // before and after a contiguous block of non-working days (WEEKLY_OFF and/or HOLIDAY),
    // all intervening off days are converted into unpaid sandwich leave (LOP).
    // E.g.: Saturday ABSENT + Sunday WEEKLY_OFF + Monday HOLIDAY + Tuesday ABSENT:
    // Both Sunday and Monday are sandwiched and converted to LOP.
    // IMPORTANT: MISSING_PUNCH, HALF_DAY, and approved leaves are NOT unapproved leaves.
    // ============================================================
    const EXPLICIT_LEAVE_STATUSES = new Set(['ABSENT', 'UNPAID_LEAVE']);
    const OFF_STATUSES = new Set(['WEEKLY_OFF', 'HOLIDAY']);

    // Build status map including boundary context (+/- 10 days) so month-edge off days are accurately evaluated
    const statusByDate = new Map<string, string>();
    for (const rec of attendanceRecords) {
      const recDate = new Date(rec.date);
      const key = recDate.toISOString().split('T')[0];
      const isBeforeJoining = joiningDateStr ? key < joiningDateStr : false;
      const recDow = recDate.getUTCDay();
      let effStatus = isBeforeJoining ? 'NOT_JOINED' : rec.status;
      if (!isBeforeJoining && Number(rec.workingHours || 0) === 0) {
        if (holidayDateSet.has(key)) effStatus = 'HOLIDAY';
        else if (weeklyOffSet.has(recDow)) effStatus = 'WEEKLY_OFF';
      }
      statusByDate.set(key, effStatus);
    }

    try {
      const boundaryStart = new Date(startDate.getTime() - 10 * 86400000);
      const boundaryEnd = new Date(endDate.getTime() + 10 * 86400000);
      const boundaryAttendance = await prisma.attendanceDaily.findMany({
        where: {
          employeeId: payroll.employeeId,
          date: { gte: boundaryStart, lte: boundaryEnd },
        },
        select: { date: true, status: true },
      });
      for (const rec of boundaryAttendance) {
        const key = new Date(rec.date).toISOString().split('T')[0];
        const isBeforeJoining = joiningDateStr ? key < joiningDateStr : false;
        if (!statusByDate.has(key)) {
          statusByDate.set(key, isBeforeJoining ? 'NOT_JOINED' : rec.status);
        }
      }
    } catch (bErr) {
      console.warn('Could not fetch boundary attendance for sandwich rule:', bErr);
    }

    const isSandwichRuleEnabled = await isEmployeeSandwichRuleEnabled(payroll.employeeId);

    let sandwichedDays = 0;
    if (isSandwichRuleEnabled) {
      for (const rec of attendanceRecords) {
        // ONLY weekly off is considered as sandwich (holidays are always paid holidays and never converted)
        if (rec.status !== 'WEEKLY_OFF') continue;

        const date = new Date(rec.date);
        const recDateStr = date.toISOString().split('T')[0];
        if (joiningDateStr && recDateStr < joiningDateStr) continue;

        // Scan backward skipping consecutive OFF_STATUSES (WEEKLY_OFF or HOLIDAY)
        let prevDate = new Date(date);
        let prevStatus: string | undefined;
        while (true) {
          prevDate.setUTCDate(prevDate.getUTCDate() - 1);
          const prevKey = prevDate.toISOString().split('T')[0];
          prevStatus = statusByDate.get(prevKey);
          if (!prevStatus || !OFF_STATUSES.has(prevStatus)) {
            break;
          }
        }

        // Scan forward skipping consecutive OFF_STATUSES (WEEKLY_OFF or HOLIDAY)
        let nextDate = new Date(date);
        let nextStatus: string | undefined;
        while (true) {
          nextDate.setUTCDate(nextDate.getUTCDate() + 1);
          const nextKey = nextDate.toISOString().split('T')[0];
          nextStatus = statusByDate.get(nextKey);
          if (!nextStatus || !OFF_STATUSES.has(nextStatus)) {
            break;
          }
        }

        // If both the preceding working day and the succeeding working day are explicit leaves
        if (prevStatus && nextStatus && EXPLICIT_LEAVE_STATUSES.has(prevStatus) && EXPLICIT_LEAVE_STATUSES.has(nextStatus)) {
          sandwichedDays++;
          weeklyOffs = Math.max(0, weeklyOffs - 1);
          unpaidLeaveDays++; // Sandwiched weekly off is treated as LOP — must be charged
        }
      }
    }

    // Calculate advance deductions
    let autoAdvanceDeduction = 0;
    let autoLoanDeduction = 0;
    for (const advance of payroll.employee.advances) {
      const remaining = Number(advance.remainingAmount);
      const installment = Math.min(Number(advance.monthlyInstallment), remaining);
      if (advance.type === 'ADVANCE') autoAdvanceDeduction += installment;
      else autoLoanDeduction += installment;
    }

    const advanceDeduction = overrides?.advanceDeduction !== undefined
      ? Math.max(0, Number(overrides.advanceDeduction))
      : (payroll.advanceDeduction !== null && Number(payroll.advanceDeduction) > 0
          ? Number(payroll.advanceDeduction)
          : autoAdvanceDeduction);

    const loanDeduction = overrides?.loanDeduction !== undefined
      ? Math.max(0, Number(overrides.loanDeduction))
      : (payroll.loanDeduction !== null && Number(payroll.loanDeduction) > 0
          ? Number(payroll.loanDeduction)
          : autoLoanDeduction);

    // Use salary calculator
    // Fetch salary slip layout config to include custom deductions (e.g. Professional Tax)
    // so that the stored netSalary exactly matches what appears on the salary slip PDF.
    const layoutConfig = await getSalarySlipLayoutConfig();
    const grossSalaryBase = Number(salary.basicSalary) + Number(salary.hra) + Number(salary.conveyance) + Number(salary.otherAllowance);
    const customDeductionsTotal = (layoutConfig.customDeductions || [])
      .reduce((sum: number, d: any) => sum + getCustomDeductionAmount(d, payroll.employee.gender, grossSalaryBase, payroll.month), 0);

    // Calculate joining salary hold (15 days)
    // Rule:
    // 1. Only applies if holdSalaryOnJoining is enabled on employee profile.
    // 2. Holds strictly ONCE during employee's tenure.
    // 3. Must MATCH the employee's joining month and year (e.g. if joined May 2026, ONLY hold in May 2026, NEVER in August or September).
    // 4. If a 15-day hold was ALREADY applied in ANY other payroll month, holdSalaryDeduction = 0.
    // 5. Stored in Employee.heldSalaryBalance & Employee.holdSalaryStatus = 'HELD' in DB.
    let holdSalaryDeduction = 0;
    const empHoldSetting = Boolean((payroll.employee as any).holdSalaryOnJoining);

    if (empHoldSetting && payroll.employee.joiningDate) {
      const empJoiningDate = new Date(payroll.employee.joiningDate);
      const isJoiningMonth = 
        empJoiningDate.getFullYear() === payroll.year && 
        (empJoiningDate.getMonth() + 1) === payroll.month;

      if (isJoiningMonth) {
        // Check if a hold was already applied in any OTHER payroll record for this employee
        const priorHold = await prisma.monthlyPayroll.findFirst({
          where: {
            employeeId: payroll.employeeId,
            holdSalaryDeduction: { gt: 0 },
            id: { not: payrollId },
          },
          select: { id: true, month: true, year: true, holdSalaryDeduction: true },
        });

        if (!priorHold) {
          // Exactly the joining month (e.g. May 2026) -> Deduct 15 days once!
          const perDaySalary = Number(salary.basicSalary) / 30;
          holdSalaryDeduction = Math.round(15 * perDaySalary * 100) / 100;

          // Persist to Employee record in DB
          await (prisma.employee.update as any)({
            where: { id: payroll.employeeId },
            data: {
              heldSalaryBalance: holdSalaryDeduction,
              holdSalaryStatus: 'HELD',
            },
          });
        } else {
          // Already held previously -> 0
          holdSalaryDeduction = 0;
        }
      } else {
        // Not the joining month (e.g. joined in May, calculating August or September) -> NEVER deduct joining hold!
        holdSalaryDeduction = 0;
      }
    } else {
      holdSalaryDeduction = 0;
    }

    const holdSalaryReleaseAmount = Number((payroll as any).holdSalaryReleaseAmount || 0);

    // Overtime is enabled by default for every employee unless explicitly disabled (false)
    const isOvertimeEligible = salary.overtimeEligible !== false;

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
      actualPresentDays: totalPhysicalPresentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      weeklyOffs,
      holidays,
      overtimeHours: isOvertimeEligible ? totalOvertimeHoursDecimal : 0,
      overtimeMinutes: isOvertimeEligible ? netOvertimeMinutes : 0,
      totalWorkingHours: totalWorkingHours,
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
      suddenLeavePenalty: Boolean((payroll.employee as any).suddenLeavePenalty),
      unpaidLeaveDaysWithLetter: Math.min(unpaidLeaveDays, unpaidLeaveDaysWithLetter),
      paidLeaveAdjustment: Number((payroll as any).paidLeaveAdjustment || 0),
      holdSalaryReleaseAmount,
      notJoinedDays,
      latePenaltyDays,
    });

    const effectiveShortHours = (payroll as any).isShortHoursCustomized
      ? Number((payroll as any).shortHoursDeduction || 0)
      : ((payroll as any).waiveShortHoursDeduction ? 0 : result.shortHoursDeduction);

    const finalTotalDeduction = Math.round(
      (result.totalDeduction - result.shortHoursDeduction + effectiveShortHours + customDeductionsTotal) * 100
    ) / 100;

    // Net Salary rounded off to nearest whole rupee (>= 0.50 rounds up, < 0.50 rounds down)
    const finalNetSalary = Math.max(0, Math.round(result.grossSalary - finalTotalDeduction));

    // Update payroll record
    try {
      await (prisma.monthlyPayroll.update as any)({
        where: { id: payrollId },
        data: {
          presentDays: payablePresentDays,
          paidLeaveDays: result.paidLeaveDays,
          unpaidLeaveDays: result.unpaidLeaveDays,
          lopDays: result.lopDays,
          latePenaltyDays,
          latePenaltyDeduction,
          suddenLeavePenaltyDays: result.suddenLeavePenaltyDays,
          suddenLeavePenaltyDeduction: result.suddenLeavePenaltyDeduction,
          ptDeduction: customDeductionsTotal,
          weeklyOffs: result.weeklyOffs,
          holidays: result.holidays,
          overtimeHours: result.overtimeAmount > 0 ? totalOvertimeHoursDecimal : 0,
          shortWorkingHours: result.shortWorkingHours,
          totalWorkingHours: totalWorkingHoursHHMM,
          sandwichedDays,
          missingPunchDays,
          basicSalary: result.basicSalary,
          hra: result.hra,
          conveyance: result.conveyance,
          otherAllowance: result.otherAllowance,
          overtimeAmount: result.overtimeAmount,
          grossSalary: result.grossSalary,
          lopDeduction: result.lopDeduction,
          shortHoursDeduction: effectiveShortHours,
          holdSalaryDeduction: result.holdSalaryDeduction,
          holdSalaryReleaseAmount: result.holdSalaryReleaseAmount || 0,
          advanceDeduction: result.advanceDeduction,
          loanDeduction: result.loanDeduction,
          otherDeduction: Number(payroll.otherDeduction || 0),
          totalDeduction: finalTotalDeduction,
          netSalary: finalNetSalary,
          status: 'CALCULATED',
        },
      });
    } catch (updateErr) {
      await prisma.monthlyPayroll.update({
        where: { id: payrollId },
        data: {
          presentDays: payablePresentDays,
          paidLeaveDays: result.paidLeaveDays,
          unpaidLeaveDays: result.unpaidLeaveDays,
          lopDays: result.lopDays,
          latePenaltyDays,
          latePenaltyDeduction,
          ptDeduction: customDeductionsTotal,
          weeklyOffs: result.weeklyOffs,
          holidays: result.holidays,
          overtimeHours: result.overtimeAmount > 0 ? totalOvertimeHoursDecimal : 0,
          shortWorkingHours: result.shortWorkingHours,
          totalWorkingHours: totalWorkingHoursHHMM,
          sandwichedDays,
          missingPunchDays,
          basicSalary: result.basicSalary,
          hra: result.hra,
          conveyance: result.conveyance,
          otherAllowance: result.otherAllowance,
          overtimeAmount: result.overtimeAmount,
          grossSalary: result.grossSalary,
          lopDeduction: result.lopDeduction,
          shortHoursDeduction: effectiveShortHours,
          holdSalaryDeduction: result.holdSalaryDeduction,
          holdSalaryReleaseAmount: (result.holdSalaryReleaseAmount || 0) as any,
          advanceDeduction: result.advanceDeduction,
          loanDeduction: result.loanDeduction,
          otherDeduction: Number(payroll.otherDeduction || 0),
          totalDeduction: finalTotalDeduction,
          netSalary: finalNetSalary,
          status: 'CALCULATED',
        },
      });

      await prisma.$executeRawUnsafe(
        'UPDATE monthly_payroll SET suddenLeavePenaltyDays = ?, suddenLeavePenaltyDeduction = ? WHERE id = ?',
        result.suddenLeavePenaltyDays || 0,
        result.suddenLeavePenaltyDeduction || 0,
        payrollId
      );
    }

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
    holdSalaryReleaseAmount?: number;
    holdSalaryReleaseReason?: string;
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
    const holdSalaryReleaseAmount = data.holdSalaryReleaseAmount !== undefined ? Math.max(0, Number(data.holdSalaryReleaseAmount)) : Number((payroll as any).holdSalaryReleaseAmount || 0);
    const holdSalaryReleaseReason = data.holdSalaryReleaseReason !== undefined ? data.holdSalaryReleaseReason : (payroll as any).holdSalaryReleaseReason;
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
        holdSalaryReleaseAmount,
        holdSalaryReleaseReason,
        waiveShortHoursDeduction,
        shortHoursDeduction,
        isShortHoursCustomized,
        otherDeduction,
        otherDeductionNote: data.otherDeductionNote || null,
        advanceDeduction,
        pfDeduction,
      },
    });

    // If hold salary is released in this payroll, update Employee balance and status
    if (holdSalaryReleaseAmount > 0) {
      await (prisma.employee.update as any)({
        where: { id: payroll.employeeId },
        data: {
          heldSalaryBalance: 0,
          holdSalaryStatus: 'RELEASED',
          holdSalaryReleasedAt: new Date(),
          holdSalaryReleaseNotes: holdSalaryReleaseReason || 'Released in monthly payroll',
        },
      });
    }

    // Trigger recalculation so the new adjustments are reflected in lopDeduction/grossSalary/totalDeduction/netSalary
    const recalcResult = await calculateEmployeePayrollInternal(payrollId, {
      advanceDeduction,
      loanDeduction,
    });
    if (!recalcResult.success) {
      return { success: false, message: 'Saved but recalculation failed: ' + recalcResult.message };
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'PayrollDeductions',
      entityId: payrollId,
      newValue: { paidLeaveAdjustment, otherDeduction, advanceDeduction, pfDeduction, holdSalaryDeduction, holdSalaryReleaseAmount },
    });

    revalidatePath('/dashboard/payroll');
    return { success: true, message: 'Deductions and adjustments updated, payroll recalculated' };
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
        select: {
          employeeId: true,
          name: true,
          designation: true,
          department: true,
          joiningDate: true,
          strictLateRule: true,
          lateThresholdMinutes: true,
        },
      },
      salarySlip: true,
    },
    orderBy: { employee: { name: 'asc' } },
  });

  // Query late arrivals for this month from attendanceDaily (counting only arrivals that EXCEED the late threshold)
  try {
    const settings = await getPayrollSettings();
    const defaultLateThreshold = Number(settings.late_threshold_minutes ?? 15);
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const lateRecords = await prisma.attendanceDaily.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        lateMinutes: { gt: 0 },
      },
      select: {
        employeeId: true,
        lateMinutes: true,
      },
    });

    const empThresholdMap = new Map(
      payrolls.map((p) => [
        p.employeeId,
        Number((p.employee as any)?.lateThresholdMinutes ?? defaultLateThreshold),
      ])
    );

    const empLateCounts = new Map<string, { count: number; totalMinutes: number }>();
    for (const rec of lateRecords) {
      const threshold = empThresholdMap.get(rec.employeeId) ?? defaultLateThreshold;
      if (rec.lateMinutes > threshold) {
        const cur = empLateCounts.get(rec.employeeId) || { count: 0, totalMinutes: 0 };
        cur.count++;
        cur.totalMinutes += rec.lateMinutes;
        empLateCounts.set(rec.employeeId, cur);
      }
    }

    for (const p of payrolls) {
      const info = empLateCounts.get(p.employeeId);
      (p as any).lateCount = info?.count || 0;
      (p as any).totalLateMinutes = info?.totalMinutes || 0;
    }
  } catch (lateErr) {
    console.warn('Could not query late attendance counts:', lateErr);
  }

  // Attach raw sudden leave penalty values to bypass any stale Prisma Client field filters
  try {
    const rawPenalties: any[] = await prisma.$queryRaw`
      SELECT id, suddenLeavePenaltyDays, suddenLeavePenaltyDeduction 
      FROM monthly_payroll 
      WHERE month = ${month} AND year = ${year}
    `;
    const penaltyMap = new Map(rawPenalties.map(r => [r.id, r]));

    for (const p of payrolls) {
      const raw = penaltyMap.get(p.id);
      if (raw) {
        (p as any).suddenLeavePenaltyDays = Number(raw.suddenLeavePenaltyDays || 0);
        (p as any).suddenLeavePenaltyDeduction = Number(raw.suddenLeavePenaltyDeduction || 0);
      }
    }
  } catch (e) {
    console.warn('Could not query raw sudden leave penalties:', e);
  }

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
  const p = await prisma.monthlyPayroll.findUnique({
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

  if (p) {
    try {
      const rawPenalties: any[] = await prisma.$queryRaw`
        SELECT id, suddenLeavePenaltyDays, suddenLeavePenaltyDeduction 
        FROM monthly_payroll 
        WHERE id = ${id}
      `;
      if (rawPenalties && rawPenalties[0]) {
        (p as any).suddenLeavePenaltyDays = Number(rawPenalties[0].suddenLeavePenaltyDays || 0);
        (p as any).suddenLeavePenaltyDeduction = Number(rawPenalties[0].suddenLeavePenaltyDeduction || 0);
      }
    } catch (e) {}
  }

  return p;
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

// ============================================================
// Release Employee Held Salary (Exit / Full & Final Settlement)
// ============================================================

export async function releaseEmployeeHeldSalary(
  employeeId: string,
  options?: {
    payrollId?: string;
    customAmount?: number;
    notes?: string;
  }
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        name: true,
        heldSalaryBalance: true,
        holdSalaryStatus: true,
      },
    });

    if (!employee) return { success: false, message: 'Employee not found' };

    const heldBalance = Number((employee as any).heldSalaryBalance || 0);
    const releaseAmount = options?.customAmount !== undefined ? Number(options.customAmount) : heldBalance;

    if (releaseAmount <= 0) {
      return { success: false, message: 'No held salary balance to release (balance is ₹0).' };
    }

    const releaseNotes = options?.notes || 'Released upon exit / full & final settlement';

    // 1. Update Employee record
    await (prisma.employee.update as any)({
      where: { id: employeeId },
      data: {
        heldSalaryBalance: Math.max(0, heldBalance - releaseAmount),
        holdSalaryStatus: 'RELEASED',
        holdSalaryReleasedAt: new Date(),
        holdSalaryReleaseNotes: releaseNotes,
      },
    });

    // 2. If target payroll ID is provided or found, credit it directly as earnings
    let targetPayrollId = options?.payrollId;
    if (!targetPayrollId) {
      // Find the latest non-finalized payroll for this employee
      const activePayroll = await prisma.monthlyPayroll.findFirst({
        where: {
          employeeId,
          status: { notIn: ['FINALIZED', 'SALARY_SLIP_GENERATED'] },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { id: true },
      });
      if (activePayroll) {
        targetPayrollId = activePayroll.id;
      }
    }

    if (targetPayrollId) {
      await (prisma.monthlyPayroll.update as any)({
        where: { id: targetPayrollId },
        data: {
          holdSalaryReleaseAmount: releaseAmount,
          holdSalaryReleaseReason: releaseNotes,
        },
      });

      // Recalculate the payroll so gross and net salary immediately reflect the refund
      await calculateEmployeePayrollInternal(targetPayrollId);
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'EmployeeHeldSalary',
      entityId: employeeId,
      newValue: {
        releasedAmount: releaseAmount,
        notes: releaseNotes,
        targetPayrollId: targetPayrollId || null,
      },
    });

    revalidatePath('/dashboard/employees');
    revalidatePath(`/dashboard/employees/${employeeId}`);
    revalidatePath('/dashboard/payroll');

    return {
      success: true,
      message: `Successfully released ₹${releaseAmount.toLocaleString('en-IN')} held salary for ${employee.name}.${targetPayrollId ? ' Credited to payroll record.' : ''}`,
    };
  } catch (error) {
    console.error('Release held salary error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, message: `Failed to release held salary: ${msg}` };
  }
}

