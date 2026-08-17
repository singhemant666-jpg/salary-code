'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/types';

export async function createLeave(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const employeeId = formData.get('employeeId') as string;
  const fromDateStr = formData.get('fromDate') as string;
  const toDateStr = formData.get('toDate') as string;
  const leaveType = formData.get('leaveType') as any;
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
        status,
        reason,
        approvedBy,
        approvedAt,
      },
    });

    // If auto-approved, update AttendanceDaily records for those dates
    if (autoApprove) {
      const dayStatus = (leaveType === 'PAID_LEAVE' || leaveType === 'SICK_LEAVE' || leaveType === 'CASUAL_LEAVE')
        ? 'PAID_LEAVE'
        : 'UNPAID_LEAVE';

      for (let d = new Date(fromDate); d <= toDate; d.setDate(d.getDate() + 1)) {
        const dayDate = new Date(d);
        await prisma.attendanceDaily.upsert({
          where: {
            employeeId_date: {
              employeeId,
              date: dayDate,
            },
          },
          update: {
            status: dayStatus,
            remarks: `Approved ${leaveType.replace('_', ' ')}: ${reason || ''}`,
          },
          create: {
            employeeId,
            date: dayDate,
            status: dayStatus,
            remarks: `Approved ${leaveType.replace('_', ' ')}: ${reason || ''}`,
          },
        });
      }
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

    await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: newStatus,
        approvedBy,
        approvedAt,
      },
    });

    // If approved, update daily attendance
    if (newStatus === 'APPROVED') {
      const dayStatus = (leave.leaveType === 'PAID_LEAVE' || leave.leaveType === 'SICK_LEAVE' || leave.leaveType === 'CASUAL_LEAVE')
        ? 'PAID_LEAVE'
        : 'UNPAID_LEAVE';

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
            remarks: `Approved ${leave.leaveType.replace('_', ' ')}: ${leave.reason || ''}`,
          },
          create: {
            employeeId: leave.employeeId,
            date: dayDate,
            status: dayStatus,
            remarks: `Approved ${leave.leaveType.replace('_', ' ')}: ${leave.reason || ''}`,
          },
        });
      }
    }

    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');

    return { success: true, message: `Leave status updated to ${newStatus}!` };
  } catch (error: any) {
    console.error('Update leave status error:', error);
    return { success: false, message: error.message || 'Failed to update leave status' };
  }
}

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
