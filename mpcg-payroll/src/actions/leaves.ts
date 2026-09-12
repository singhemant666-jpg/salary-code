'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';
import { calculateEmployeePayrollInternal } from '@/actions/payroll';
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
  const leaveType = (formData.get('leaveType') as any) || 'UNPAID_LEAVE';
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

    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard');
    revalidatePath('/apply-leave');

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
  const leaveType = formData.get('leaveType') as any;
  const isHalfDay = formData.get('isHalfDay') === 'true';
  const halfDayType = (formData.get('halfDayType') as string) || null;
  const halfDayTime = (formData.get('halfDayTime') as string) || null;
  const reason = formData.get('reason') as string;
  const autoApprove = formData.get('autoApprove') === 'true';

  if (!employeeId || !fromDateStr || !toDateStr || !leaveType) {
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

    // If auto-approved, update AttendanceDaily records for those dates
    if (autoApprove) {
      await syncLeaveToAttendance(leave);
    }

    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');

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
  newStatus: 'APPROVED' | 'REJECTED' | 'CANCELLED'
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

    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: newStatus,
        approvedBy,
        approvedAt,
      },
    });

    // If approved, update daily attendance and recalculate active payroll for that month
    if (newStatus === 'APPROVED') {
      await syncLeaveToAttendance(updatedLeave);
    }

    // Trigger payroll recalculation for the affected month if payroll exists
    const month = leave.fromDate.getUTCMonth() + 1;
    const year = leave.fromDate.getUTCFullYear();
    const existingPayroll = await prisma.monthlyPayroll.findUnique({
      where: {
        employeeId_month_year: {
          employeeId: leave.employeeId,
          month,
          year,
        },
      },
    });

    if (existingPayroll) {
      await calculateEmployeePayrollInternal(existingPayroll.id);
    }

    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard');

    return { success: true, message: `Leave application ${newStatus} successfully!` };
  } catch (error: any) {
    console.error('Update leave status error:', error);
    return { success: false, message: error.message || 'Failed to update leave status' };
  }
}

/**
 * Helper to sync approved leave dates directly into AttendanceDaily table
 */
async function syncLeaveToAttendance(leave: any) {
  const dayStatus = leave.isHalfDay
    ? 'HALF_DAY'
    : (leave.leaveType === 'PAID_LEAVE' || leave.leaveType === 'SICK_LEAVE' || leave.leaveType === 'CASUAL_LEAVE')
    ? 'PAID_LEAVE'
    : 'UNPAID_LEAVE';

  const timeInfo = leave.isHalfDay && leave.halfDayTime ? ` (${leave.halfDayTime})` : '';

  for (let d = new Date(leave.fromDate); d <= leave.toDate; d.setDate(d.getDate() + 1)) {
    const dayDate = new Date(d);
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
 * Delete Leave Record
 */
export async function deleteLeave(leaveId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    await prisma.leave.delete({
      where: { id: leaveId },
    });

    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');

    return { success: true, message: 'Leave record deleted successfully!' };
  } catch (error: any) {
    console.error('Delete leave error:', error);
    return { success: false, message: error.message || 'Failed to delete leave' };
  }
}
