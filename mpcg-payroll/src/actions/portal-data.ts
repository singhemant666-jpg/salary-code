'use server';

import { prisma } from '@/lib/prisma';
import { ensureDatabaseSchemaSynced } from '@/lib/db-auto-migrate';
import { getPortalSession } from './portal-auth';
import { generateSalarySlipToken } from '@/lib/salary-slip-token';
import { getPortalNoticesForEmployee } from './portal-notices';
import { revalidatePath } from 'next/cache';
import { timeHHMMToMinutes, minutesToReadableString } from '@/lib/currency-utils';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatTimeString(timeStr: string | null): string {
  if (!timeStr || !timeStr.includes(':')) return '';
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedH = h % 12 || 12;
  return `${String(formattedH).padStart(2, '0')}:${m} ${ampm}`;
}

export interface PortalAttendanceDay {
  id: string;
  dateStr: string; // YYYY-MM-DD
  dayDisplay: string; // e.g. "14 Nov (Sat)"
  dayNumber: number;
  isToday: boolean;
  firstIn: string | null;
  lastOut: string | null;
  workingHours: number;
  workingHoursDisplay: string;
  status: string;
  lateMinutes: number;
  overtimeHours: number;
  overtimeDisplay: string | null;
  shortWorkingHours: number;
  shortHoursDisplay: string | null;
  remarks: string | null;
}

export interface PortalAttendanceSummary {
  month: number;
  year: number;
  monthName: string;
  totalDays: number;
  monthTotalDays: number;
  isCurrentMonth: boolean;
  currentDay: number;
  presentDays: number;
  halfDays: number;
  absentDays: number;
  paidLeaves: number;
  unpaidLeaves: number;
  weeklyOffs: number;
  holidays: number;
  totalHoursWorked: number;
  totalOvertimeHours: number;
  totalShortHours: number;
  lateCount: number;
  totalLateMinutes: number;
  missingPunchCount: number;
}

export interface PortalDeductionItem {
  name: string;
  countDisplay: string;
  amount: number;
}

export interface PortalSalarySlipItem {
  id: string;
  month: number;
  year: number;
  periodName: string; // e.g. "November 2026"
  basicSalary: number;
  overtimeHours: number;
  overtimeAmount: number;
  bonusAmount: number;
  incentiveAmount: number;
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  presentDays: number;
  lopDays: number;
  deductions: PortalDeductionItem[];
  deductionCount: number;
  status: string;
  downloadUrl: string;
}

/**
 * Fetch all employee data needed for the Portal dashboard
 */
export async function getPortalDashboardData(month?: number, year?: number) {
  await ensureDatabaseSchemaSynced();

  const employee = await getPortalSession();
  if (!employee) {
    return { authenticated: false as const };
  }

  const now = new Date();
  const targetYear = year || now.getFullYear();
  const targetMonth = month || now.getMonth() + 1;

  // 1. Fetch Attendance Records for the given Month & Year
  const startOfMonth = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
  const endOfMonth = new Date(Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999));

  const [rawAttendance, leaves, shiftOverrides, payrollSlips, notices] = await Promise.all([
    prisma.attendanceDaily.findMany({
      where: {
        employeeId: employee.id,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.leave.findMany({
      where: { employeeId: employee.id },
      orderBy: { fromDate: 'desc' },
      take: 25,
    }),
    prisma.shiftOverride.findMany({
      where: { employeeId: employee.id },
      orderBy: { fromDate: 'desc' },
      take: 25,
    }),
    prisma.monthlyPayroll.findMany({
      where: {
        employeeId: employee.id,
        isPublishedToPortal: true,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    }),
    getPortalNoticesForEmployee(employee.id),
  ]);

  // Determine today's date in IST (UTC+5:30)
  const istDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // "YYYY-MM-DD"
  const [curYear, curMonth, curDay] = istDateStr.split('-').map(Number);

  const isCurrentMonth = targetYear === curYear && targetMonth === curMonth;
  const isFutureMonth = targetYear > curYear || (targetYear === curYear && targetMonth > curMonth);
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();

  // Show only days up to today for current month; empty for future months; full month for past months
  // Sorted DESCENDING (newest / current date at the top)
  const activeAttendance = (isFutureMonth
    ? []
    : isCurrentMonth
    ? rawAttendance.filter((rec) => {
        const d = new Date(rec.date);
        return d.getUTCDate() <= curDay;
      })
    : rawAttendance
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Attendance stats aggregation
  let presentDays = 0;
  let halfDays = 0;
  let absentDays = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let weeklyOffs = 0;
  let holidays = 0;
  let totalHoursWorked = 0;
  let totalOvertimeHours = 0;
  let totalShortHours = 0;
  let lateCount = 0;
  let totalLateMinutes = 0;
  let missingPunchCount = 0;

  const stdHours = Number(employee.standardWorkingHours || 9.0);
  const stdMins = Math.round(stdHours * 60);

  const attendanceList: PortalAttendanceDay[] = activeAttendance.map((rec) => {
    const d = new Date(rec.date);
    const dayNumber = d.getUTCDate();
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const monthShort = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const dayDisplay = `${String(dayNumber).padStart(2, '0')} ${monthShort} (${dayName})`;
    const dateStr = d.toISOString().split('T')[0];
    const isToday = isCurrentMonth && dayNumber === curDay;

    const hours = Number(rec.workingHours || 0);
    const workedMins = timeHHMMToMinutes(hours);
    const otFromDb = Number(rec.overtimeHours || 0);

    // OT minutes
    const otMins = otFromDb > 0 ? timeHHMMToMinutes(otFromDb) : (workedMins > stdMins ? workedMins - stdMins : 0);
    const otDecimal = otFromDb > 0 ? otFromDb : (otMins > 0 ? Math.round((Math.floor(otMins / 60) + (otMins % 60) / 100) * 100) / 100 : 0);

    // Short working hours (applicable when employee worked, or on present/half-day, less than std hours)
    let shortMins = 0;
    if (workedMins > 0 && workedMins < stdMins && rec.status !== 'WEEKLY_OFF' && rec.status !== 'HOLIDAY') {
      shortMins = stdMins - workedMins;
    }
    const shortHrsVal = shortMins > 0 ? Math.round((Math.floor(shortMins / 60) + (shortMins % 60) / 100) * 100) / 100 : 0;

    totalHoursWorked += hours;
    totalOvertimeHours += otDecimal;
    totalShortHours += shortHrsVal;

    if (rec.lateMinutes > 0) {
      lateCount += 1;
      totalLateMinutes += rec.lateMinutes;
    }

    // Missing punch check (explicit status, single punch recorded, or missing punch remarks)
    // EXCLUDE today (current date) because employee will punch OUT at the end of the shift!
    const isMissingPunch =
      !isToday &&
      (rec.status === 'MISSING_PUNCH' ||
        (rec.remarks && rec.remarks.toLowerCase().includes('missing punch')) ||
        (rec.firstIn && !rec.lastOut) ||
        (!rec.firstIn && rec.lastOut));

    if (isMissingPunch) {
      missingPunchCount += 1;
    }

    // Status and Remarks adjustments for today:
    let dayStatus: string = rec.status;
    let dayRemarks = rec.remarks;

    if (isToday) {
      // For current date: do NOT mark as "MISSING PUNCH" because shift is in progress and employee punches OUT at end of shift.
      if (
        rec.status === 'MISSING_PUNCH' ||
        (!rec.lastOut && rec.firstIn) ||
        (rec.remarks && (rec.remarks.toLowerCase().includes('missing punch') || rec.remarks.toLowerCase().includes('out punch missing')))
      ) {
        dayStatus = 'PENDING_PUNCH';
        dayRemarks = rec.firstIn
          ? `Pending punch of today (Logged in at ${formatTimeString(rec.firstIn)} · Shift in progress)`
          : 'Pending punch of today · Shift in progress';
      } else if (!rec.firstIn && !rec.lastOut && rec.status === 'ABSENT') {
        dayStatus = 'PENDING_PUNCH';
        dayRemarks = 'Pending punch of today';
      }
    }

    const workingHoursDisplay = workedMins > 0 ? minutesToReadableString(workedMins) : '--';
    const overtimeDisplay = otMins > 0 ? minutesToReadableString(otMins) : null;
    const shortHoursDisplay = shortMins > 0 ? minutesToReadableString(shortMins) : null;

    switch (rec.status) {
      case 'PRESENT':
        presentDays += 1;
        break;
      case 'HALF_DAY':
        halfDays += 1;
        break;
      case 'ABSENT':
        if (!isToday) absentDays += 1;
        break;
      case 'PAID_LEAVE':
        paidLeaves += 1;
        break;
      case 'UNPAID_LEAVE':
        unpaidLeaves += 1;
        break;
      case 'WEEKLY_OFF':
        weeklyOffs += 1;
        break;
      case 'HOLIDAY':
        holidays += 1;
        break;
      case 'MISSING_PUNCH':
        if (isToday && rec.firstIn) {
          presentDays += 1;
        }
        break;
      default:
        if (isToday && rec.firstIn) {
          presentDays += 1;
        }
        break;
    }

    return {
      id: rec.id,
      dateStr,
      dayDisplay,
      dayNumber,
      isToday,
      firstIn: rec.firstIn,
      lastOut: rec.lastOut,
      workingHours: hours,
      workingHoursDisplay,
      status: dayStatus,
      lateMinutes: rec.lateMinutes,
      overtimeHours: otDecimal,
      overtimeDisplay,
      shortWorkingHours: shortHrsVal,
      shortHoursDisplay,
      remarks: dayRemarks,
    };
  });

  const summary: PortalAttendanceSummary = {
    month: targetMonth,
    year: targetYear,
    monthName: MONTH_NAMES[targetMonth - 1] || '',
    totalDays: isCurrentMonth ? curDay : daysInMonth,
    monthTotalDays: daysInMonth,
    isCurrentMonth,
    currentDay: curDay,
    presentDays,
    halfDays,
    absentDays,
    paidLeaves,
    unpaidLeaves,
    weeklyOffs,
    holidays,
    totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
    totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
    totalShortHours: Math.round(totalShortHours * 100) / 100,
    lateCount,
    totalLateMinutes,
    missingPunchCount,
  };

  // Format salary slips with secure direct download tokens and itemized deduction breakdown
  const salarySlips: PortalSalarySlipItem[] = payrollSlips.map((p) => {
    const token = generateSalarySlipToken(p.id);

    const deductions: PortalDeductionItem[] = [];

    // 1. Applied Leave Deduction (pure applied leaves, excluding late coming and sudden leave)
    const lateAmt = Number(p.latePenaltyDeduction || 0);
    const lateDays = Number(p.latePenaltyDays || 0);
    const suddenAmt = Number(p.suddenLeavePenaltyDeduction || 0);
    const suddenDays = Number(p.suddenLeavePenaltyDays || 0);
    const rawLopAmt = Number(p.lopDeduction || 0);
    const rawLopDays = Number(p.lopDays || 0);

    const pureLopAmt = Math.max(0, Math.round((rawLopAmt - lateAmt - suddenAmt) * 100) / 100);
    const perDayRate = Number(p.basicSalary || p.grossSalary || 0) / 30;
    const pureLopDays = perDayRate > 0 && pureLopAmt > 0
      ? Math.round((pureLopAmt / perDayRate) * 10) / 10
      : Math.max(0, Math.round((rawLopDays - lateDays - suddenDays) * 10) / 10);

    if (pureLopAmt > 0 || pureLopDays > 0) {
      deductions.push({
        name: 'Applied Leave Deduction',
        countDisplay: `${pureLopDays} day${pureLopDays === 1 ? '' : 's'}`,
        amount: pureLopAmt,
      });
    }

    // 2. Sudden Leave Deduction
    if (suddenAmt > 0 || suddenDays > 0) {
      deductions.push({
        name: 'Sudden Leave Deduction',
        countDisplay: `${suddenDays} day${suddenDays === 1 ? '' : 's'}`,
        amount: suddenAmt,
      });
    }

    // 3. Short Working Hours
    const shortAmt = Number(p.shortHoursDeduction || 0);
    const shortHrs = Number(p.shortWorkingHours || 0);
    if (shortAmt > 0 || shortHrs > 0) {
      deductions.push({
        name: 'Short Working Hours',
        countDisplay: `${shortHrs} hr${shortHrs === 1 ? '' : 's'}`,
        amount: shortAmt,
      });
    }

    // 4. Professional Tax (PT)
    const ptAmt = Number(p.ptDeduction || 0);
    if (ptAmt > 0) {
      deductions.push({
        name: 'Professional Tax (PT)',
        countDisplay: 'Monthly',
        amount: ptAmt,
      });
    }

    // 5. Tax Deducted at Source (TDS)
    const tdsAmt = Number(p.tdsDeduction || 0);
    if (tdsAmt > 0) {
      deductions.push({
        name: 'TDS (Income Tax)',
        countDisplay: 'Tax',
        amount: tdsAmt,
      });
    }

    // 6. Provident Fund (PF)
    const pfAmt = Number(p.pfDeduction || 0);
    if (pfAmt > 0) {
      deductions.push({
        name: 'Provident Fund (PF)',
        countDisplay: 'Monthly',
        amount: pfAmt,
      });
    }

    // 7. Advance Recovery
    const advAmt = Number(p.advanceDeduction || 0);
    if (advAmt > 0) {
      deductions.push({
        name: 'Salary Advance Recovery',
        countDisplay: '1 deduction',
        amount: advAmt,
      });
    }

    // 8. Loan Recovery
    const loanAmt = Number(p.loanDeduction || 0);
    if (loanAmt > 0) {
      deductions.push({
        name: 'Loan Recovery',
        countDisplay: 'Installment',
        amount: loanAmt,
      });
    }

    // 9. Security Deposit / Salary Hold
    const holdAmt = Number(p.holdSalaryDeduction || 0);
    if (holdAmt > 0) {
      deductions.push({
        name: 'Joining Salary Hold',
        countDisplay: '15 days',
        amount: holdAmt,
      });
    }

    // 10. Other Deductions (Late coming and missing punch show under Other Deduction)
    const rawOtherAmt = Number(p.otherDeduction || 0);
    const combinedOtherAmt = Math.round((rawOtherAmt + lateAmt) * 100) / 100;
    if (combinedOtherAmt > 0) {
      let countDisplay = 'Adjustment';
      if (lateDays > 0 && rawOtherAmt === 0) {
        countDisplay = `${lateDays} day${lateDays === 1 ? '' : 's'}`;
      } else if (lateDays > 0) {
        countDisplay = `${lateDays} days + adj`;
      }
      deductions.push({
        name: 'Other Deduction',
        countDisplay,
        amount: combinedOtherAmt,
      });
    }

    return {
      id: p.id,
      month: p.month,
      year: p.year,
      periodName: `${MONTH_NAMES[p.month - 1] || ''} ${p.year}`,
      basicSalary: Number(p.basicSalary || 0),
      overtimeHours: Number(p.overtimeHours || 0),
      overtimeAmount: Number(p.overtimeAmount || 0),
      bonusAmount: Number(p.bonusAmount || 0),
      incentiveAmount: Number(p.incentiveAmount || 0),
      grossSalary: Number(p.grossSalary || 0),
      totalDeduction: Number(p.totalDeduction || 0),
      netSalary: Number(p.netSalary || 0),
      presentDays: Number(p.presentDays || 0),
      lopDays: pureLopDays,
      deductions,
      deductionCount: deductions.length,
      status: p.status,
      downloadUrl: `/api/salary-slip/${p.id}?token=${token}`,
    };
  });

  // Format leaves for display
  const leavesFormatted = leaves.map((l) => ({
    id: l.id,
    leaveType: l.leaveType,
    fromDateStr: new Date(l.fromDate).toISOString().split('T')[0],
    toDateStr: new Date(l.toDate).toISOString().split('T')[0],
    isHalfDay: l.isHalfDay,
    halfDayType: l.halfDayType,
    halfDayTime: l.halfDayTime,
    status: l.status,
    reason: l.reason,
    createdAt: l.createdAt.toISOString(),
  }));

  // Format shift overrides
  const shiftOverridesFormatted = shiftOverrides.map((s) => ({
    id: s.id,
    fromDateStr: new Date(s.fromDate).toISOString().split('T')[0],
    toDateStr: new Date(s.toDate).toISOString().split('T')[0],
    shiftStartTime: s.shiftStartTime,
    shiftEndTime: s.shiftEndTime,
    reason: s.reason,
    status: s.status,
    rejectionReason: s.rejectionReason,
    createdAt: s.createdAt.toISOString(),
  }));

  return {
    authenticated: true as const,
    employee,
    summary,
    attendanceList,
    leaves: leavesFormatted,
    shiftOverrides: shiftOverridesFormatted,
    salarySlips,
    notices: notices.broadcasts,
    warnings: notices.warnings,
  };
}

/**
 * Apply for Leave directly from Employee Portal (Pre-authenticated session)
 */
export async function submitPortalLeave(data: {
  leaveType: string;
  fromDate: string;
  toDate: string;
  isHalfDay: boolean;
  halfDayType?: string;
  halfDayTime?: string;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const employee = await getPortalSession();
    if (!employee) {
      return { success: false, message: 'Session expired. Please login again.' };
    }

    if (!data.fromDate || !data.toDate) {
      return { success: false, message: 'Please select start and end dates.' };
    }

    if (!data.reason || data.reason.trim().length < 5) {
      return { success: false, message: 'Please write a brief reason for your leave request (at least 5 characters).' };
    }

    const fromDate = new Date(`${data.fromDate}T00:00:00.000Z`);
    const toDate = new Date(`${data.toDate}T00:00:00.000Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return { success: false, message: 'Invalid dates provided.' };
    }

    if (toDate < fromDate) {
      return { success: false, message: 'To Date cannot be earlier than From Date.' };
    }

    const validTypes = ['PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE', 'CASUAL_LEAVE'];
    const leaveType = (validTypes.includes(data.leaveType) ? data.leaveType : 'UNPAID_LEAVE') as any;

    await prisma.leave.create({
      data: {
        employeeId: employee.id,
        leaveType,
        fromDate,
        toDate,
        isHalfDay: Boolean(data.isHalfDay),
        halfDayType: data.isHalfDay ? data.halfDayType || null : null,
        halfDayTime: data.isHalfDay ? data.halfDayTime || null : null,
        mobileNumber: employee.mobile,
        reason: data.reason.trim(),
        status: 'PENDING',
      },
    });

    revalidatePath('/portal');
    return {
      success: true,
      message: 'Your leave application has been submitted and is pending HR approval!',
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to submit leave application.' };
  }
}

/**
 * Request Shift Timing Change directly from Employee Portal (Pre-authenticated session)
 */
export async function submitPortalShiftRequest(data: {
  fromDate: string;
  toDate: string;
  shiftStartTime: string;
  shiftEndTime: string;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const employee = await getPortalSession();
    if (!employee) {
      return { success: false, message: 'Session expired. Please login again.' };
    }

    if (!data.fromDate || !data.toDate) {
      return { success: false, message: 'Please select start and end dates.' };
    }

    if (!data.shiftStartTime || !data.shiftEndTime) {
      return { success: false, message: 'Please enter requested shift start and end times.' };
    }

    const fromDate = new Date(`${data.fromDate}T00:00:00.000Z`);
    const toDate = new Date(`${data.toDate}T00:00:00.000Z`);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return { success: false, message: 'Invalid dates provided.' };
    }

    if (toDate < fromDate) {
      return { success: false, message: 'To Date cannot be earlier than From Date.' };
    }

    await prisma.shiftOverride.create({
      data: {
        employeeId: employee.id,
        fromDate,
        toDate,
        shiftStartTime: data.shiftStartTime.trim(),
        shiftEndTime: data.shiftEndTime.trim(),
        reason: data.reason?.trim() || null,
        status: 'PENDING',
        createdBy: `PORTAL:${employee.name}`,
      },
    });

    revalidatePath('/portal');
    return {
      success: true,
      message: 'Your shift timing request has been submitted and is pending HR review!',
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to submit shift request.' };
  }
}

/**
 * Sync Live Cloud Biometric Punches from Realsoft Cloud for Employee Portal
 */
export async function syncPortalRealtimeCloud(month?: number, year?: number): Promise<{ success: boolean; message: string }> {
  const employee = await getPortalSession();
  if (!employee) {
    return { success: false, message: 'Unauthorized portal session' };
  }

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  try {
    const { syncRealtimeCloudPunches } = await import('@/actions/realtime-cloud-sync');
    const result = await syncRealtimeCloudPunches(
      undefined,
      undefined,
      true, // bypass NextAuth admin session check since portal session is verified above
      { month: targetMonth, year: targetYear }
    );
    revalidatePath('/portal');
    return {
      success: result.success,
      message: result.message || (result.success ? 'Biometric punches synced successfully!' : 'Sync failed'),
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Cloud sync failed' };
  }
}

/**
 * Recalculate Attendance from Raw Punches for Employee Portal
 */
export async function recalculatePortalAttendance(month?: number, year?: number): Promise<{ success: boolean; message: string }> {
  const employee = await getPortalSession();
  if (!employee) {
    return { success: false, message: 'Unauthorized portal session' };
  }

  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();

  try {
    const { processAttendanceInternal } = await import('@/actions/attendance');
    const result = await processAttendanceInternal(targetMonth, targetYear);
    revalidatePath('/portal');
    return {
      success: result.success,
      message: result.message || (result.success ? 'Attendance recalculated successfully!' : 'Recalculation failed'),
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Recalculation failed' };
  }
}
