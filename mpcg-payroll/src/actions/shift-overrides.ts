'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAuditLog, formatUserIdentity } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';
import { processAttendance } from '@/actions/attendance';
import { calculateEmployeePayrollInternal } from '@/actions/payroll';
import type { ActionResult } from '@/types';

export interface CreateShiftOverrideInput {
  employeeId: string;
  fromDate: string;     // YYYY-MM-DD
  toDate: string;       // YYYY-MM-DD
  shiftStartTime: string; // e.g. "12:00"
  shiftEndTime: string;   // e.g. "21:00"
  reason?: string;
}

export interface ApplyShiftOverrideInput {
  employeeId: string;
  fromDate: string;     // YYYY-MM-DD
  toDate: string;       // YYYY-MM-DD
  shiftStartTime: string; // e.g. "12:00"
  shiftEndTime: string;   // e.g. "21:00"
  reason: string;
  mobileNumber?: string;
}

/**
 * Fetch list of shift timing overrides with optional filtering
 */
export async function getShiftOverrides(month?: number, year?: number, employeeId?: string, status?: string) {
  try {
    let whereClause: any = {};

    if (employeeId && employeeId.trim() !== '') {
      whereClause.employeeId = employeeId;
    }

    if (status && status.trim() !== '' && status !== 'ALL') {
      whereClause.status = status;
    }

    if (month && year) {
      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59));
      whereClause.OR = [
        {
          fromDate: { lte: endDate },
          toDate: { gte: startDate },
        }
      ];
    }

    if ((prisma as any).shiftOverride?.findMany) {
      const overrides = await (prisma as any).shiftOverride.findMany({
        where: whereClause,
        include: {
          employee: {
            select: { employeeId: true, name: true, designation: true, department: true }
          }
        },
        orderBy: [{ createdAt: 'desc' }, { fromDate: 'desc' }]
      });
      return overrides.map((r: any) => ({
        ...r,
        status: r.status || 'APPROVED',
      }));
    }
  } catch (error) {
    console.warn('Prisma ORM shiftOverride query skipped, falling back to raw query:', error);
  }

  // Fallback to raw query if Prisma client cache is stale or model is undefined on globalThis
  try {
    const rawRows: any[] = await prisma.$queryRaw`
      SELECT s.*, e.employeeId as emp_code, e.name as emp_name, e.designation as emp_desig, e.department as emp_dept
      FROM shift_overrides s
      JOIN employees e ON s.employeeId = e.id
      ORDER BY s.createdAt DESC, s.fromDate DESC
    `;
    let filtered = rawRows;
    if (status && status !== 'ALL') {
      filtered = rawRows.filter(r => (r.status || 'APPROVED') === status);
    }
    if (employeeId && employeeId.trim() !== '') {
      filtered = filtered.filter(r => r.employeeId === employeeId);
    }

    return filtered.map(r => ({
      id: r.id,
      employeeId: r.employeeId,
      fromDate: r.fromDate,
      toDate: r.toDate,
      shiftStartTime: r.shiftStartTime,
      shiftEndTime: r.shiftEndTime,
      reason: r.reason,
      status: r.status || 'APPROVED',
      approvedBy: r.approvedBy,
      approvedAt: r.approvedAt,
      rejectionReason: r.rejectionReason,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      employee: {
        employeeId: r.emp_code,
        name: r.emp_name,
        designation: r.emp_desig,
        department: r.emp_dept,
      }
    }));
  } catch (rawErr) {
    console.error('Raw shift overrides query failed:', rawErr);
    return [];
  }
}

/**
 * Public / Employee Shift Timing Override Application (No Admin Login Required)
 * Submits with status = 'PENDING' for HR / Super Admin approval.
 */
export async function applyEmployeeShiftOverride(input: ApplyShiftOverrideInput): Promise<ActionResult> {
  try {
    const { employeeId, fromDate, toDate, shiftStartTime, shiftEndTime, reason, mobileNumber } = input;

    if (!employeeId || !fromDate || !toDate || !shiftStartTime || !shiftEndTime) {
      return { success: false, message: 'Please provide all required fields: Employee, Dates, and Shift Timings.' };
    }

    const fromStr = fromDate.split('T')[0];
    const toStr = toDate.split('T')[0];
    const startDate = new Date(`${fromStr}T00:00:00.000Z`);
    const endDate = new Date(`${toStr}T00:00:00.000Z`);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return { success: false, message: 'Invalid dates provided.' };
    }

    if (startDate > endDate) {
      return { success: false, message: 'From Date cannot be after To Date.' };
    }

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, employeeId: true, status: true },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return { success: false, message: 'Active employee profile not found.' };
    }

    const note = reason?.trim() ? reason.trim() : 'Employee requested shift timing override';
    const id = 'so_' + Date.now() + Math.random().toString(36).substring(2, 7);

    try {
      if ((prisma as any).shiftOverride?.create) {
        await (prisma as any).shiftOverride.create({
          data: {
            id,
            employeeId,
            fromDate: startDate,
            toDate: endDate,
            shiftStartTime,
            shiftEndTime,
            reason: note,
            status: 'PENDING',
            createdBy: `Employee Application (${employee.name})`,
          },
        });
      } else {
        await prisma.$executeRawUnsafe(
          `INSERT INTO shift_overrides (id, employeeId, fromDate, toDate, shiftStartTime, shiftEndTime, reason, status, createdBy, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW(), NOW())`,
          id,
          employeeId,
          startDate,
          endDate,
          shiftStartTime,
          shiftEndTime,
          note,
          `Employee Application (${employee.name})`
        );
      }
    } catch (dbErr) {
      // Fallback direct raw insert
      await prisma.$executeRawUnsafe(
        `INSERT INTO shift_overrides (id, employeeId, fromDate, toDate, shiftStartTime, shiftEndTime, reason, status, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, NOW(), NOW())`,
        id,
        employeeId,
        startDate,
        endDate,
        shiftStartTime,
        shiftEndTime,
        note,
        `Employee Application (${employee.name})`
      );
    }

    try {
      revalidatePath('/dashboard/attendance/shifts');
      revalidatePath('/apply-leave');
    } catch (e) {}
    await createAuditLog({
      userName: `Employee Portal: ${employee.name} (${employee.employeeId})`,
      action: 'APPLY',
      entity: 'ShiftOverride',
      entityId: id,
      newValue: {
        employee: employee.name,
        employeeId: employee.employeeId,
        fromDate: fromStr,
        toDate: toStr,
        shiftStartTime,
        shiftEndTime,
        reason: note,
        status: 'PENDING',
      },
      reason: `Employee submitted shift timing override request (${shiftStartTime} - ${shiftEndTime}) for ${fromStr} to ${toStr}`,
    });

    return {
      success: true,
      message: 'Shift timing override request submitted! It is now PENDING approval from HR / Super Admin. Once approved, your timing will be updated and late marks will not be deducted.',
    };
  } catch (error: any) {
    console.error('applyEmployeeShiftOverride error:', error);
    return { success: false, message: error.message || 'Failed to submit shift timing override request' };
  }
}

/**
 * Approve a Shift Timing Override (HR / Super Admin)
 * Sets status = 'APPROVED', reprocesses attendance and payroll so late penalties are not deducted!
 */
export async function approveShiftOverride(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    let override: any = null;
    try {
      if ((prisma as any).shiftOverride?.findUnique) {
        override = await (prisma as any).shiftOverride.findUnique({ where: { id } });
      }
    } catch (e) {}

    if (!override) {
      const raw: any[] = await prisma.$queryRaw`SELECT * FROM shift_overrides WHERE id = ${id}`;
      override = raw[0];
    }

    if (!override) {
      return { success: false, message: 'Shift override record not found.' };
    }

    const adminName = session.user.name || session.user.email || 'HR / Super Admin';
    const approvedAt = new Date();

    try {
      if ((prisma as any).shiftOverride?.update) {
        await (prisma as any).shiftOverride.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedBy: adminName,
            approvedAt,
          },
        });
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE shift_overrides SET status = 'APPROVED', approvedBy = ?, approvedAt = NOW() WHERE id = ?`,
          adminName,
          id
        );
      }
    } catch (updateErr) {
      await prisma.$executeRawUnsafe(
        `UPDATE shift_overrides SET status = 'APPROVED', approvedBy = ?, approvedAt = NOW() WHERE id = ?`,
        adminName,
        id
      );
    }

    // Auto-reprocess attendance & payroll for affected month(s) so updated shift timings take effect immediately
    const startDate = new Date(override.fromDate);
    const endDate = new Date(override.toDate);
    const affectedMonths = new Set<string>();

    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const m = d.getUTCMonth() + 1;
      const y = d.getUTCFullYear();
      affectedMonths.add(`${m}-${y}`);
    }

    for (const key of affectedMonths) {
      const [mStr, yStr] = key.split('-');
      const month = parseInt(mStr);
      const year = parseInt(yStr);

      try {
        await processAttendance(month, year);
      } catch (attErr) {
        console.warn(`Attendance reprocessing error for ${month}/${year}:`, attErr);
      }

      const existingPayroll = await prisma.monthlyPayroll.findUnique({
        where: {
          employeeId_month_year: {
            employeeId: override.employeeId,
            month,
            year,
          }
        }
      });
      if (existingPayroll) {
        await calculateEmployeePayrollInternal(existingPayroll.id);
      }
    }

    let empName = override.employee?.name;
    if (!empName && override.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: override.employeeId },
        select: { name: true, employeeId: true },
      });
      if (emp) empName = `${emp.name} (${emp.employeeId})`;
    }

    await createAuditLog({
      userId: session.user.id,
      userName: formatUserIdentity(session.user),
      action: 'APPROVE',
      entity: 'ShiftOverride',
      entityId: id,
      oldValue: {
        employee: empName || override.employeeId,
        status: override.status || 'PENDING',
        shiftStartTime: override.shiftStartTime,
        shiftEndTime: override.shiftEndTime,
      },
      newValue: {
        employee: empName || override.employeeId,
        status: 'APPROVED',
        approvedBy: adminName,
        approvedAt,
        shiftStartTime: override.shiftStartTime,
        shiftEndTime: override.shiftEndTime,
      },
      reason: `Approved shift timing override (${override.shiftStartTime} - ${override.shiftEndTime}) for ${empName || override.employeeId}. Late penalty waived.`,
    });

    revalidatePath('/dashboard/attendance/shifts');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard/audit-log');
    revalidatePath('/apply-leave');

    return {
      success: true,
      message: 'Shift timing override APPROVED! Attendance and late coming calculations have been updated.',
    };
  } catch (error: any) {
    console.error('approveShiftOverride error:', error);
    return { success: false, message: error.message || 'Failed to approve shift timing override' };
  }
}

/**
 * Reject a Shift Timing Override (HR / Super Admin)
 */
export async function rejectShiftOverride(id: string, reason?: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    let override: any = null;
    try {
      if ((prisma as any).shiftOverride?.findUnique) {
        override = await (prisma as any).shiftOverride.findUnique({ where: { id } });
      }
    } catch (e) {}

    if (!override) {
      const raw: any[] = await prisma.$queryRaw`SELECT * FROM shift_overrides WHERE id = ${id}`;
      override = raw[0];
    }

    if (!override) {
      return { success: false, message: 'Shift override record not found.' };
    }

    const wasApproved = override.status === 'APPROVED';
    const adminName = session.user.name || session.user.email || 'HR / Super Admin';

    try {
      if ((prisma as any).shiftOverride?.update) {
        await (prisma as any).shiftOverride.update({
          where: { id },
          data: {
            status: 'REJECTED',
            approvedBy: adminName,
            rejectionReason: reason || null,
          },
        });
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE shift_overrides SET status = 'REJECTED', approvedBy = ?, rejectionReason = ? WHERE id = ?`,
          adminName,
          reason || null,
          id
        );
      }
    } catch (err) {
      await prisma.$executeRawUnsafe(
        `UPDATE shift_overrides SET status = 'REJECTED', approvedBy = ?, rejectionReason = ? WHERE id = ?`,
        adminName,
        reason || null,
        id
      );
    }

    // If it was previously approved, recalculate attendance to revert shift timing back to normal
    if (wasApproved) {
      const startDate = new Date(override.fromDate);
      const endDate = new Date(override.toDate);
      const affectedMonths = new Set<string>();

      for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const m = d.getUTCMonth() + 1;
        const y = d.getUTCFullYear();
        affectedMonths.add(`${m}-${y}`);
      }

      for (const key of affectedMonths) {
        const [mStr, yStr] = key.split('-');
        const month = parseInt(mStr);
        const year = parseInt(yStr);

        try {
          await processAttendance(month, year);
        } catch (attErr) {}

        const existingPayroll = await prisma.monthlyPayroll.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: override.employeeId,
              month,
              year,
            }
          }
        });
        if (existingPayroll) {
          await calculateEmployeePayrollInternal(existingPayroll.id);
        }
      }
    }

    let empName = override.employee?.name;
    if (!empName && override.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: override.employeeId },
        select: { name: true, employeeId: true },
      });
      if (emp) empName = `${emp.name} (${emp.employeeId})`;
    }

    await createAuditLog({
      userId: session.user.id,
      userName: formatUserIdentity(session.user),
      action: 'REJECT',
      entity: 'ShiftOverride',
      entityId: id,
      oldValue: {
        employee: empName || override.employeeId,
        status: override.status,
      },
      newValue: {
        employee: empName || override.employeeId,
        status: 'REJECTED',
        rejectionReason: reason || null,
      },
      reason: `Rejected shift override for ${empName || override.employeeId}. Note: ${reason || 'None provided'}`,
    });

    revalidatePath('/dashboard/attendance/shifts');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard/audit-log');
    revalidatePath('/apply-leave');

    return { success: true, message: 'Shift timing override request rejected.' };
  } catch (error: any) {
    console.error('rejectShiftOverride error:', error);
    return { success: false, message: error.message || 'Failed to reject shift timing override' };
  }
}

/**
 * Create a new date-wise custom shift timing override for an employee (Direct Admin Creation)
 * Direct admin creation is automatically APPROVED.
 */
export async function createShiftOverride(input: CreateShiftOverrideInput): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const { employeeId, fromDate, toDate, shiftStartTime, shiftEndTime, reason } = input;

    if (!employeeId || !fromDate || !toDate || !shiftStartTime || !shiftEndTime) {
      return { success: false, message: 'All required fields must be provided.' };
    }

    const fromStr = fromDate.split('T')[0];
    const toStr = toDate.split('T')[0];
    const startDate = new Date(`${fromStr}T00:00:00.000Z`);
    const endDate = new Date(`${toStr}T00:00:00.000Z`);

    if (startDate > endDate) {
      return { success: false, message: 'From Date cannot be after To Date.' };
    }

    const adminName = session.user.name || 'HR Admin';
    const id = 'so_' + Date.now() + Math.random().toString(36).substring(2, 7);

    let created = false;
    if ((prisma as any).shiftOverride?.create) {
      try {
        await (prisma as any).shiftOverride.create({
          data: {
            id,
            employeeId,
            fromDate: startDate,
            toDate: endDate,
            shiftStartTime,
            shiftEndTime,
            reason: reason || null,
            status: 'APPROVED',
            approvedBy: adminName,
            approvedAt: new Date(),
            createdBy: adminName,
          },
        });
        created = true;
      } catch (e) {
        console.warn('Prisma create failed, falling back to executeRawUnsafe:', e);
      }
    }

    if (!created) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO shift_overrides (id, employeeId, fromDate, toDate, shiftStartTime, shiftEndTime, reason, status, approvedBy, approvedAt, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, NOW(), ?, NOW(), NOW())`,
        id,
        employeeId,
        startDate,
        endDate,
        shiftStartTime,
        shiftEndTime,
        reason || null,
        adminName,
        adminName
      );
    }

    // Auto-reprocess attendance & payroll for affected month(s)
    const affectedMonths = new Set<string>();
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const m = d.getUTCMonth() + 1;
      const y = d.getUTCFullYear();
      affectedMonths.add(`${m}-${y}`);
    }

    for (const key of affectedMonths) {
      const [mStr, yStr] = key.split('-');
      const month = parseInt(mStr);
      const year = parseInt(yStr);

      try {
        await processAttendance(month, year);
      } catch (attErr) {
        console.warn(`Attendance reprocessing error for ${month}/${year}:`, attErr);
      }

      // Recalculate employee payroll if exists
      const existingPayroll = await prisma.monthlyPayroll.findUnique({
        where: {
          employeeId_month_year: {
            employeeId,
            month,
            year,
          }
        }
      });
      if (existingPayroll) {
        await calculateEmployeePayrollInternal(existingPayroll.id);
      }
    }

    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { name: true, employeeId: true },
    });
    const empDisplay = emp ? `${emp.name} (${emp.employeeId})` : employeeId;

    await createAuditLog({
      userId: session.user.id,
      userName: formatUserIdentity(session.user),
      action: 'CREATE',
      entity: 'ShiftOverride',
      entityId: id,
      newValue: {
        employee: empDisplay,
        fromDate: fromStr,
        toDate: toStr,
        shiftStartTime,
        shiftEndTime,
        reason: reason || null,
        status: 'APPROVED',
      },
      reason: `Direct shift override created for ${empDisplay}: ${shiftStartTime} - ${shiftEndTime} (${fromStr} to ${toStr})`,
    });

    revalidatePath('/dashboard/attendance/shifts');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard/audit-log');

    return { success: true, message: 'Shift timing override created and attendance updated successfully!' };
  } catch (error: any) {
    console.error('Create shift override error:', error);
    return { success: false, message: error.message || 'Failed to create shift override' };
  }
}

/**
 * Delete a shift override record
 */
export async function deleteShiftOverride(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    let override: any = null;
    if ((prisma as any).shiftOverride?.findUnique) {
      try {
        override = await (prisma as any).shiftOverride.findUnique({ where: { id } });
      } catch (e) {}
    }

    if (!override) {
      const raw: any[] = await prisma.$queryRaw`SELECT * FROM shift_overrides WHERE id = ${id}`;
      override = raw[0];
    }

    if (!override) return { success: false, message: 'Shift override record not found.' };

    const wasApproved = override.status === 'APPROVED';

    if ((prisma as any).shiftOverride?.delete) {
      try {
        await (prisma as any).shiftOverride.delete({ where: { id } });
      } catch (e) {
        await prisma.$executeRawUnsafe(`DELETE FROM shift_overrides WHERE id = ?`, id);
      }
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM shift_overrides WHERE id = ?`, id);
    }

    // Auto-reprocess attendance for affected range if it was active
    if (wasApproved) {
      const startDate = new Date(override.fromDate);
      const endDate = new Date(override.toDate);
      const affectedMonths = new Set<string>();

      for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const m = d.getUTCMonth() + 1;
        const y = d.getUTCFullYear();
        affectedMonths.add(`${m}-${y}`);
      }

      for (const key of affectedMonths) {
        const [mStr, yStr] = key.split('-');
        const month = parseInt(mStr);
        const year = parseInt(yStr);

        try {
          await processAttendance(month, year);
        } catch (attErr) {}

        const existingPayroll = await prisma.monthlyPayroll.findUnique({
          where: {
            employeeId_month_year: {
              employeeId: override.employeeId,
              month,
              year,
            }
          }
        });
        if (existingPayroll) {
          await calculateEmployeePayrollInternal(existingPayroll.id);
        }
      }
    }

    let empName = override.employee?.name;
    if (!empName && override.employeeId) {
      const emp = await prisma.employee.findUnique({
        where: { id: override.employeeId },
        select: { name: true, employeeId: true },
      });
      if (emp) empName = `${emp.name} (${emp.employeeId})`;
    }

    await createAuditLog({
      userId: session.user.id,
      userName: formatUserIdentity(session.user),
      action: 'DELETE',
      entity: 'ShiftOverride',
      entityId: id,
      oldValue: {
        employee: empName || override.employeeId,
        fromDate: override.fromDate,
        toDate: override.toDate,
        shiftStartTime: override.shiftStartTime,
        shiftEndTime: override.shiftEndTime,
        status: override.status,
      },
      reason: `Deleted shift timing override for ${empName || override.employeeId} (${override.shiftStartTime} - ${override.shiftEndTime})`,
    });

    revalidatePath('/dashboard/attendance/shifts');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    revalidatePath('/dashboard/audit-log');

    return { success: true, message: 'Shift override deleted and attendance recalculated!' };
  } catch (error: any) {
    console.error('Delete shift override error:', error);
    return { success: false, message: error.message || 'Failed to delete shift override' };
  }
}
