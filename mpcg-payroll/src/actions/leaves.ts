'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import { calculateEmployeePayrollInternal } from '@/actions/payroll';
import {
  processDailyPunches,
  type AttendanceSettings,
} from '@/lib/attendance-processor';
import { sendGupshupWhatsApp, sendGupshupTemplate, getWhatsAppSettings } from '@/lib/whatsapp';
import { otpMap } from '@/lib/otpStore';

/**
 * Send WhatsApp OTP for Employee Verification
 */
export async function sendLeaveWhatsAppOTP(
  employeeId: string,
  mobileNumber: string
): Promise<ActionResult & { demoOtp?: string }> {
  if (!employeeId || !mobileNumber) {
    return { success: false, message: 'Employee profile and mobile number are required.' };
  }

  const cleanMobile = mobileNumber.replace(/\D/g, '');
  if (cleanMobile.length < 10) {
    return { success: false, message: 'Invalid mobile number format. 10 digits required.' };
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes valid

  otpMap.set(cleanMobile, { otp: otpCode, expiresAt });
  otpMap.set(employeeId, { otp: otpCode, expiresAt });

  const messageText = `MY PAIN CLINIC GLOBAL\n\nYour WhatsApp OTP for Employee Leave Verification is: ${otpCode}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.`;

  const settings = await getWhatsAppSettings();

  let waRes;
  if (settings.useTemplate && settings.templateIdOtp) {
    waRes = await sendGupshupTemplate(cleanMobile, settings.templateIdOtp, [otpCode]);
  } else {
    waRes = await sendGupshupWhatsApp(cleanMobile, messageText);
  }

  if (waRes.success) {
    return {
      success: true,
      message: `WhatsApp OTP sent successfully to registered profile number (+91 ${cleanMobile.slice(-10)}).`,
    };
  } else {
    return {
      success: true,
      message: `WhatsApp status: ${waRes.message}. (For Testing, your OTP is: ${otpCode})`,
      demoOtp: otpCode,
    };
  }
}

/**
 * Verify WhatsApp OTP for Employee Verification
 */
export async function verifyLeaveWhatsAppOTP(
  mobileOrEmpId: string,
  enteredOtp: string
): Promise<ActionResult> {
  if (!mobileOrEmpId || !enteredOtp) {
    return { success: false, message: 'Please enter the 6-digit OTP code.' };
  }

  const cleanKey = mobileOrEmpId.replace(/\D/g, '') || mobileOrEmpId.trim();
  const record = otpMap.get(cleanKey) || otpMap.get(mobileOrEmpId.trim());

  if (!record) {
    return { success: false, message: 'No OTP requested for this profile or number. Please click Send WhatsApp OTP.' };
  }

  if (Date.now() > record.expiresAt) {
    otpMap.delete(cleanKey);
    otpMap.delete(mobileOrEmpId.trim());
    return { success: false, message: 'OTP has expired. Please request a new WhatsApp OTP.' };
  }

  if (record.otp !== enteredOtp.trim()) {
    return { success: false, message: 'Invalid OTP code. Please check and try again.' };
  }

  otpMap.delete(cleanKey);
  otpMap.delete(mobileOrEmpId.trim());

  return {
    success: true,
    message: 'WhatsApp OTP verified successfully!',
  };
}


/**
 * Public / Employee Leave Application (No Admin Login Required)
 * Employees can submit their leave application with name, mobile, dates, half day time, and written letter/reason.
 * Defaults status to PENDING so HR/Admin can approve or reject in the Leave Management panel.
 */
export async function applyEmployeeLeave(formData: FormData): Promise<ActionResult> {
  const employeeId = formData.get('employeeId') as string;
  const mobileNumber = (formData.get('mobileNumber') as string) || null;
  const fromDateStr = formData.get('fromDate') as string;
  const toDateStr = formData.get('toDate') as string;
  const rawLeaveType = (formData.get('leaveType') as string)?.trim();
  const validTypes = ['PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE', 'CASUAL_LEAVE'];
  const leaveType = (validTypes.includes(rawLeaveType || '') ? rawLeaveType : 'CASUAL_LEAVE') as any;
  const isHalfDay = formData.get('isHalfDay') === 'true';
  const halfDayType = (formData.get('halfDayType') as string) || null;
  const halfDayTime = (formData.get('halfDayTime') as string) || null;
  const reason = formData.get('reason') as string;

  if (!employeeId || !fromDateStr || !toDateStr) {
    return { success: false, message: 'Please fill in all required fields (Employee, From Date, To Date)' };
  }

  const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
  const toDate = new Date(`${toDateStr}T00:00:00.000Z`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { success: false, message: 'Invalid dates provided' };
  }

  if (toDate < fromDate) {
    return { success: false, message: 'To date cannot be earlier than From date' };
  }

  try {
    const leave = await prisma.leave.create({
      data: {
        employeeId,
        fromDate,
        toDate,
        leaveType,
        isHalfDay,
        halfDayType,
        halfDayTime,
        mobileNumber,
        status: 'PENDING',
        reason,
      },
    });

    try {
      revalidatePath('/dashboard/attendance/leaves');
      revalidatePath('/dashboard/attendance');
      revalidatePath('/dashboard');
      revalidatePath('/apply-leave');
    } catch (e) {
      // Ignore revalidatePath when called from CLI scripts
    }

    return {
      success: true,
      message: 'Leave application submitted successfully! Your application is now PENDING for Admin approval.',
    };
  } catch (error: any) {
    console.error('Apply employee leave error:', error);
    return { success: false, message: error.message || 'Failed to submit leave application' };
  }
}

/**
 * HR / Admin Create Leave Action
 */
export async function createLeave(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const employeeId = formData.get('employeeId') as string;
  const mobileNumber = (formData.get('mobileNumber') as string) || null;
  const fromDateStr = formData.get('fromDate') as string;
  const toDateStr = formData.get('toDate') as string;
  const rawLeaveType = (formData.get('leaveType') as string)?.trim();
  const validTypes = ['PAID_LEAVE', 'UNPAID_LEAVE', 'SICK_LEAVE', 'CASUAL_LEAVE'];
  const leaveType = (validTypes.includes(rawLeaveType || '') ? rawLeaveType : 'CASUAL_LEAVE') as any;
  const isHalfDay = formData.get('isHalfDay') === 'true';
  const halfDayType = (formData.get('halfDayType') as string) || null;
  const halfDayTime = (formData.get('halfDayTime') as string) || null;
  const reason = formData.get('reason') as string;
  const autoApprove = formData.get('autoApprove') === 'true';

  if (!employeeId || !fromDateStr || !toDateStr || !rawLeaveType) {
    return { success: false, message: 'Please fill in all required fields' };
  }

  const fromDate = new Date(`${fromDateStr}T00:00:00.000Z`);
  const toDate = new Date(`${toDateStr}T00:00:00.000Z`);

  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    return { success: false, message: 'Invalid dates provided' };
  }

  if (toDate < fromDate) {
    return { success: false, message: 'To date cannot be earlier than From date' };
  }

  try {
    const status = autoApprove ? 'APPROVED' : 'PENDING';
    const approvedBy = autoApprove ? (session.user.name || 'HR Admin') : null;
    const approvedAt = autoApprove ? new Date() : null;

    const leave = await prisma.leave.create({
      data: {
        employeeId,
        fromDate,
        toDate,
        leaveType,
        isHalfDay,
        halfDayType,
        halfDayTime,
        mobileNumber,
        status,
        reason,
        approvedBy,
        approvedAt,
      },
    });

    // If auto-approved, update AttendanceDaily records for those dates and recalculate payroll
    if (autoApprove) {
      await syncLeaveToAttendance(leave);
      await recalculatePayrollsForEmployeeRange(leave.employeeId, leave.fromDate, leave.toDate);
    }

    revalidateLeavePaths(leave.employeeId);

    return { success: true, message: 'Leave record created successfully!' };
  } catch (error: any) {
    console.error('Create leave error:', error);
    return { success: false, message: error.message || 'Failed to create leave record' };
  }
}

/**
 * HR / Admin Approve or Reject Leave Application
 */
export async function updateLeaveStatus(
  leaveId: string,
  newStatus: 'APPROVED' | 'REJECTED' | 'CANCELLED',
  approvedFromDate?: string | Date,
  approvedToDate?: string | Date
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const leave = await prisma.leave.findUnique({
      where: { id: leaveId },
      include: { employee: true },
    });

    if (!leave) return { success: false, message: 'Leave record not found' };

    const approvedBy = newStatus === 'APPROVED' ? (session.user.name || 'HR Admin') : null;
    const approvedAt = newStatus === 'APPROVED' ? new Date() : null;

    const updateData: any = {
      status: newStatus,
      approvedBy,
      approvedAt,
    };

    if (newStatus === 'APPROVED' && approvedFromDate && approvedToDate) {
      const fromStr = typeof approvedFromDate === 'string' ? approvedFromDate.split('T')[0] : approvedFromDate.toISOString().split('T')[0];
      const toStr = typeof approvedToDate === 'string' ? approvedToDate.split('T')[0] : approvedToDate.toISOString().split('T')[0];
      updateData.fromDate = new Date(`${fromStr}T00:00:00.000Z`);
      updateData.toDate = new Date(`${toStr}T00:00:00.000Z`);
    }

    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: updateData,
    });

    // If approved, update daily attendance and recalculate active payroll for that month
    if (newStatus === 'APPROVED') {
      await syncLeaveToAttendance(updatedLeave);
    } else {
      await cleanupLeaveFromAttendance(updatedLeave);
    }

    // Recalculate payroll for the affected months
    await recalculatePayrollsForEmployeeRange(
      updatedLeave.employeeId,
      leave.fromDate < updatedLeave.fromDate ? leave.fromDate : updatedLeave.fromDate,
      leave.toDate > updatedLeave.toDate ? leave.toDate : updatedLeave.toDate
    );

    revalidateLeavePaths(updatedLeave.employeeId);

    return { success: true, message: `Leave application ${newStatus} successfully!` };
  } catch (error: any) {
    console.error('Update leave status error:', error);
    return { success: false, message: error.message || 'Failed to update leave status' };
  }
}

/**
 * Helper to sync approved leave dates directly into AttendanceDaily table
 * Weekly Offs (Sundays) and Company Holidays are non-working days and must NEVER be overwritten as leave/LOP!
 */
async function syncLeaveToAttendance(leave: any) {
  const dayStatus = leave.isHalfDay
    ? 'HALF_DAY'
    : (leave.leaveType === 'PAID_LEAVE' || leave.leaveType === 'SICK_LEAVE' || leave.leaveType === 'CASUAL_LEAVE')
    ? 'PAID_LEAVE'
    : 'UNPAID_LEAVE';

  const timeInfo = leave.isHalfDay && leave.halfDayTime ? ` (${leave.halfDayTime})` : '';

  // Get holidays
  const holidays = await prisma.holiday.findMany({ select: { date: true, name: true } });
  const holidayMap = new Map<string, string>();
  for (const h of holidays) {
    holidayMap.set(new Date(h.date).toISOString().split('T')[0], h.name);
  }

  // Get weekly off settings
  const settingsRecords = await prisma.payrollSetting.findMany({
    where: { key: 'weekly_off_days' },
  });
  let weeklyOffDays = new Set<number>([0]); // Default Sunday
  try {
    if (settingsRecords[0]?.value) {
      const parsed = JSON.parse(settingsRecords[0].value);
      if (Array.isArray(parsed)) weeklyOffDays = new Set(parsed);
    }
  } catch {}

  for (let d = new Date(leave.fromDate); d <= leave.toDate; d.setDate(d.getDate() + 1)) {
    const dayDate = new Date(d);
    const dateStr = dayDate.toISOString().split('T')[0];
    const dayOfWeek = dayDate.getUTCDay();

    // 1. If date is a Company Holiday, it remains a paid Holiday!
    if (holidayMap.has(dateStr)) {
      const holidayName = holidayMap.get(dateStr);
      await prisma.attendanceDaily.upsert({
        where: {
          employeeId_date: {
            employeeId: leave.employeeId,
            date: dayDate,
          },
        },
        update: {
          status: 'HOLIDAY',
          remarks: `Holiday: ${holidayName || 'Official Holiday'}`,
        },
        create: {
          employeeId: leave.employeeId,
          date: dayDate,
          status: 'HOLIDAY',
          remarks: `Holiday: ${holidayName || 'Official Holiday'}`,
        },
      });
      continue;
    }

    // 2. If date is a Weekly Off (e.g. Sunday), it remains a Weekly Off!
    if (weeklyOffDays.has(dayOfWeek)) {
      await prisma.attendanceDaily.upsert({
        where: {
          employeeId_date: {
            employeeId: leave.employeeId,
            date: dayDate,
          },
        },
        update: {
          status: 'WEEKLY_OFF',
          remarks: 'Weekly Off',
        },
        create: {
          employeeId: leave.employeeId,
          date: dayDate,
          status: 'WEEKLY_OFF',
          remarks: 'Weekly Off',
        },
      });
      continue;
    }

    // 3. Regular working day: Apply leave
    await prisma.attendanceDaily.upsert({
      where: {
        employeeId_date: {
          employeeId: leave.employeeId,
          date: dayDate,
        },
      },
      update: {
        status: dayStatus,
        remarks: `Approved ${leave.leaveType.replace('_', ' ')}${timeInfo}: ${leave.reason || ''}`,
      },
      create: {
        employeeId: leave.employeeId,
        date: dayDate,
        status: dayStatus,
        remarks: `Approved ${leave.leaveType.replace('_', ' ')}${timeInfo}: ${leave.reason || ''}`,
      },
    });
  }
}

/**
 * Helper to cleanup attendance daily when leave is deleted or rejected/cancelled.
 * Reconstructs accurate daily attendance based on raw punches, shift settings, holidays, and weekly offs.
 */
async function cleanupLeaveFromAttendance(leave: any) {
  const holidays = await prisma.holiday.findMany({ select: { date: true, name: true } });
  const holidayMap = new Map<string, string>();
  for (const h of holidays) {
    holidayMap.set(new Date(h.date).toISOString().split('T')[0], h.name);
  }

  const settingsRecords = await prisma.payrollSetting.findMany({
    where: { key: 'weekly_off_days' },
  });
  let weeklyOffDays = new Set<number>([0]);
  try {
    if (settingsRecords[0]?.value) {
      const parsed = JSON.parse(settingsRecords[0].value);
      if (Array.isArray(parsed)) weeklyOffDays = new Set(parsed);
    }
  } catch {}

  const employee = await prisma.employee.findUnique({
    where: { id: leave.employeeId },
    select: {
      id: true,
      standardWorkingHours: true,
      halfDayThreshold: true,
      lateThresholdMinutes: true,
      overtimeAfterHours: true,
      shiftStartTime: true,
      shiftEndTime: true,
      joiningDate: true,
    },
  });

  const empStandardHours = Number(employee?.standardWorkingHours) || 9;
  const empHalfDayThreshold = Number((employee as any)?.halfDayThreshold) || 5;
  const empLateThreshold = (employee as any)?.lateThresholdMinutes !== undefined && (employee as any)?.lateThresholdMinutes !== null
    ? Number((employee as any)?.lateThresholdMinutes)
    : 5;
  const empOvertimeAfter = Number((employee as any)?.overtimeAfterHours) || empStandardHours;

  const empJoiningDate = employee?.joiningDate ? new Date(employee.joiningDate) : null;
  const empJoiningDateStr = empJoiningDate ? empJoiningDate.toISOString().split('T')[0] : null;

  for (let d = new Date(leave.fromDate); d <= leave.toDate; d.setDate(d.getDate() + 1)) {
    const dayDate = new Date(d);
    const dateStr = dayDate.toISOString().split('T')[0];
    const dayOfWeek = dayDate.getUTCDay();

    // Check if employee has another APPROVED leave covering this date
    const otherLeave = await prisma.leave.findFirst({
      where: {
        id: { not: leave.id },
        employeeId: leave.employeeId,
        status: 'APPROVED',
        fromDate: { lte: dayDate },
        toDate: { gte: dayDate },
      },
    });

    if (otherLeave) {
      const dayStatus = otherLeave.isHalfDay
        ? 'HALF_DAY'
        : (otherLeave.leaveType === 'PAID_LEAVE' || otherLeave.leaveType === 'SICK_LEAVE' || otherLeave.leaveType === 'CASUAL_LEAVE')
        ? 'PAID_LEAVE'
        : 'UNPAID_LEAVE';
      const timeInfo = otherLeave.isHalfDay && otherLeave.halfDayTime ? ` (${otherLeave.halfDayTime})` : '';

      if (holidayMap.has(dateStr)) {
        await prisma.attendanceDaily.upsert({
          where: { employeeId_date: { employeeId: leave.employeeId, date: dayDate } },
          update: { status: 'HOLIDAY', remarks: `Holiday: ${holidayMap.get(dateStr) || 'Official Holiday'}` },
          create: { employeeId: leave.employeeId, date: dayDate, status: 'HOLIDAY', remarks: `Holiday: ${holidayMap.get(dateStr) || 'Official Holiday'}` },
        });
      } else if (weeklyOffDays.has(dayOfWeek)) {
        await prisma.attendanceDaily.upsert({
          where: { employeeId_date: { employeeId: leave.employeeId, date: dayDate } },
          update: { status: 'WEEKLY_OFF', remarks: 'Weekly Off' },
          create: { employeeId: leave.employeeId, date: dayDate, status: 'WEEKLY_OFF', remarks: 'Weekly Off' },
        });
      } else {
        await prisma.attendanceDaily.upsert({
          where: { employeeId_date: { employeeId: leave.employeeId, date: dayDate } },
          update: { status: dayStatus, remarks: `Approved ${otherLeave.leaveType.replace('_', ' ')}${timeInfo}: ${otherLeave.reason || ''}` },
          create: { employeeId: leave.employeeId, date: dayDate, status: dayStatus, remarks: `Approved ${otherLeave.leaveType.replace('_', ' ')}${timeInfo}: ${otherLeave.reason || ''}` },
        });
      }
      continue;
    }

    // Check shift overrides
    let shiftOverride: any = null;
    try {
      shiftOverride = await (prisma as any).shiftOverride.findFirst({
        where: {
          employeeId: leave.employeeId,
          fromDate: { lte: dayDate },
          toDate: { gte: dayDate },
        },
      });
    } catch {
      try {
        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM shift_overrides 
          WHERE employeeId = ${leave.employeeId} AND fromDate <= ${dayDate} AND toDate >= ${dayDate}
          LIMIT 1
        `;
        shiftOverride = rows[0] || null;
      } catch {}
    }

    const dayShiftStart = shiftOverride ? shiftOverride.shiftStartTime : ((employee as any)?.shiftStartTime || '09:00');
    const dayShiftEnd = shiftOverride ? shiftOverride.shiftEndTime : ((employee as any)?.shiftEndTime || '18:00');

    const attendanceSettings: AttendanceSettings = {
      standardWorkingHours: empStandardHours,
      halfDayThreshold: empHalfDayThreshold,
      lateThresholdMinutes: empLateThreshold,
      overtimeAfterHours: empOvertimeAfter,
      shiftStartTime: dayShiftStart,
      shiftEndTime: dayShiftEnd,
      weeklyOffDays: Array.from(weeklyOffDays),
    };

    const isHoliday = holidayMap.has(dateStr);
    const isWeeklyOff = weeklyOffDays.has(dayOfWeek);
    const isBeforeJoining = empJoiningDateStr ? dateStr < empJoiningDateStr : false;

    // Fetch punches
    const punches = await prisma.attendanceRaw.findMany({
      where: { employeeId: leave.employeeId, date: dayDate },
      orderBy: { time: 'asc' },
    });

    if (isBeforeJoining) {
      await prisma.attendanceDaily.upsert({
        where: { employeeId_date: { employeeId: leave.employeeId, date: dayDate } },
        update: {
          firstIn: null,
          lastOut: null,
          workingHours: 0,
          lateMinutes: 0,
          earlyDeparture: 0,
          overtimeHours: 0,
          status: 'ABSENT',
          remarks: 'Not joined yet',
        },
        create: {
          employeeId: leave.employeeId,
          date: dayDate,
          status: 'ABSENT',
          remarks: 'Not joined yet',
        },
      });
    } else if (punches.length > 0) {
      const punchData = punches.map(p => ({
        employeeId: p.employeeId,
        date: dateStr,
        time: p.time,
        punchType: p.punchType as 'IN' | 'OUT',
      }));

      const result = processDailyPunches(
        leave.employeeId,
        dateStr,
        punchData,
        attendanceSettings,
        isHoliday,
        isWeeklyOff
      );

      await prisma.attendanceDaily.upsert({
        where: { employeeId_date: { employeeId: leave.employeeId, date: dayDate } },
        update: {
          firstIn: result.firstIn || null,
          lastOut: result.lastOut || null,
          workingHours: result.workingHours,
          status: result.status,
          lateMinutes: result.lateMinutes,
          earlyDeparture: result.earlyDeparture,
          overtimeHours: result.overtimeHours,
          remarks: result.remarks,
        },
        create: {
          employeeId: leave.employeeId,
          date: dayDate,
          firstIn: result.firstIn || null,
          lastOut: result.lastOut || null,
          workingHours: result.workingHours,
          status: result.status,
          lateMinutes: result.lateMinutes,
          earlyDeparture: result.earlyDeparture,
          overtimeHours: result.overtimeHours,
          remarks: result.remarks,
        },
      });
    } else {
      let status = 'ABSENT';
      let remarks: string | null = 'No punch recorded';
      if (isHoliday) {
        status = 'HOLIDAY';
        remarks = `Holiday: ${holidayMap.get(dateStr) || 'Official Holiday'}`;
      } else if (isWeeklyOff) {
        status = 'WEEKLY_OFF';
        remarks = 'Weekly Off';
      }

      await prisma.attendanceDaily.upsert({
        where: { employeeId_date: { employeeId: leave.employeeId, date: dayDate } },
        update: {
          firstIn: null,
          lastOut: null,
          workingHours: 0,
          lateMinutes: 0,
          earlyDeparture: 0,
          overtimeHours: 0,
          status: status as any,
          remarks,
        },
        create: {
          employeeId: leave.employeeId,
          date: dayDate,
          status: status as any,
          remarks,
        },
      });
    }
  }
}

/**
 * Helper to recalculate payroll for an employee across all months spanned by fromDate to toDate
 */
async function recalculatePayrollsForEmployeeRange(employeeId: string, fromDate: Date, toDate: Date) {
  const monthsToUpdate = new Set<string>();
  const cur = new Date(fromDate);
  const end = new Date(toDate);
  while (cur <= end) {
    const m = cur.getUTCMonth() + 1;
    const y = cur.getUTCFullYear();
    monthsToUpdate.add(`${m}_${y}`);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  for (const my of monthsToUpdate) {
    const [monthStr, yearStr] = my.split('_');
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);

    const existingPayroll = await prisma.monthlyPayroll.findUnique({
      where: {
        employeeId_month_year: {
          employeeId,
          month,
          year,
        },
      },
    });

    if (existingPayroll) {
      await calculateEmployeePayrollInternal(existingPayroll.id);
    }
  }
}

/**
 * Revalidate all related cache paths for attendance, leaves, payroll, and employee profile
 */
function revalidateLeavePaths(employeeId?: string) {
  try {
    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard/employees');
    if (employeeId) {
      revalidatePath(`/dashboard/employees/${employeeId}`);
    }
    revalidatePath('/dashboard');
    revalidatePath('/apply-leave');
  } catch (e) {
    // Ignore in non-request contexts
  }
}

/**
 * Delete Leave Record
 */
export async function deleteLeave(leaveId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const leave = await prisma.leave.findUnique({ where: { id: leaveId } });
    if (!leave) return { success: false, message: 'Leave not found' };

    await prisma.leave.delete({
      where: { id: leaveId },
    });

    await cleanupLeaveFromAttendance(leave);
    await recalculatePayrollsForEmployeeRange(leave.employeeId, leave.fromDate, leave.toDate);

    revalidateLeavePaths(leave.employeeId);

    return { success: true, message: 'Leave record deleted successfully!' };
  } catch (error: any) {
    console.error('Delete leave error:', error);
    return { success: false, message: error.message || 'Failed to delete leave' };
  }
}
