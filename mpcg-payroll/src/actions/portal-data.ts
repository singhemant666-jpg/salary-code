'use server';

import { prisma } from '@/lib/prisma';
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

export interface PortalAttendanceDay {
  id: string;
  dateStr: string; // YYYY-MM-DD
  dayDisplay: string; // e.g. "14 Nov (Sat)"
  dayNumber: number;
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
}

export interface PortalSalarySlipItem {
  id: string;
  month: number;
  year: number;
  periodName: string; // e.g. "November 2026"
  grossSalary: number;
  totalDeduction: number;
  netSalary: number;
  presentDays: number;
  lopDays: number;
  status: string;
  downloadUrl: string;
}

/**
 * Fetch all employee data needed for the Portal dashboard
 */
export async function getPortalDashboardData(month?: number, year?: number) {
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
      orderBy: { date: 'asc' },
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
        status: { in: ['FINALIZED', 'APPROVED', 'SALARY_SLIP_GENERATED'] },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 12,
    }),
    getPortalNoticesForEmployee(employee.id),
  ]);

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

  const stdHours = Number(employee.standardWorkingHours || 9.0);
  const stdMins = Math.round(stdHours * 60);

  const attendanceList: PortalAttendanceDay[] = rawAttendance.map((rec) => {
    const d = new Date(rec.date);
    const dayNumber = d.getUTCDate();
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    const monthShort = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    const dayDisplay = `${String(dayNumber).padStart(2, '0')} ${monthShort} (${dayName})`;
    const dateStr = d.toISOString().split('T')[0];

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
        absentDays += 1;
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
      default:
        break;
    }

    return {
      id: rec.id,
      dateStr,
      dayDisplay,
      dayNumber,
      firstIn: rec.firstIn,
      lastOut: rec.lastOut,
      workingHours: hours,
      workingHoursDisplay,
      status: rec.status,
      lateMinutes: rec.lateMinutes,
      overtimeHours: otDecimal,
      overtimeDisplay,
      shortWorkingHours: shortHrsVal,
      shortHoursDisplay,
      remarks: rec.remarks,
    };
  });

  const summary: PortalAttendanceSummary = {
    month: targetMonth,
    year: targetYear,
    monthName: MONTH_NAMES[targetMonth - 1] || '',
    totalDays: new Date(targetYear, targetMonth, 0).getDate(),
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
  };

  // Format salary slips with secure direct download tokens
  const salarySlips: PortalSalarySlipItem[] = payrollSlips.map((p) => {
    const token = generateSalarySlipToken(p.id);
    return {
      id: p.id,
      month: p.month,
      year: p.year,
      periodName: `${MONTH_NAMES[p.month - 1] || ''} ${p.year}`,
      grossSalary: Number(p.grossSalary || 0),
      totalDeduction: Number(p.totalDeduction || 0),
      netSalary: Number(p.netSalary || 0),
      presentDays: Number(p.presentDays || 0),
      lopDays: Number(p.lopDays || 0),
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
