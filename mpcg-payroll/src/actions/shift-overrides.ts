'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
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

/**
 * Fetch list of shift timing overrides with optional filtering
 */
export async function getShiftOverrides(month?: number, year?: number, employeeId?: string) {
  try {
    let whereClause: any = {};

    if (employeeId && employeeId.trim() !== '') {
      whereClause.employeeId = employeeId;
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
        orderBy: { fromDate: 'desc' }
      });
      return overrides;
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
      ORDER BY s.fromDate DESC
    `;
    return rawRows.map(r => ({
      id: r.id,
      employeeId: r.employeeId,
      fromDate: r.fromDate,
      toDate: r.toDate,
      shiftStartTime: r.shiftStartTime,
      shiftEndTime: r.shiftEndTime,
      reason: r.reason,
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
 * Create a new date-wise custom shift timing override for an employee
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

    let created: any = null;
    if ((prisma as any).shiftOverride?.create) {
      try {
        created = await (prisma as any).shiftOverride.create({
          data: {
            employeeId,
            fromDate: startDate,
            toDate: endDate,
            shiftStartTime,
            shiftEndTime,
            reason: reason || null,
            createdBy: session.user.name || 'HR Admin',
          },
        });
      } catch (e) {
        console.warn('Prisma create failed, falling back to executeRawUnsafe:', e);
      }
    }

    if (!created) {
      const id = 'so_' + Date.now() + Math.random().toString(36).substring(2, 7);
      await prisma.$executeRawUnsafe(
        `INSERT INTO shift_overrides (id, employeeId, fromDate, toDate, shiftStartTime, shiftEndTime, reason, createdBy, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        id,
        employeeId,
        startDate,
        endDate,
        shiftStartTime,
        shiftEndTime,
        reason || null,
        session.user.name || 'HR Admin'
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

    revalidatePath('/dashboard/attendance/shifts');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');

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

    if ((prisma as any).shiftOverride?.delete) {
      try {
        await (prisma as any).shiftOverride.delete({ where: { id } });
      } catch (e) {
        await prisma.$executeRawUnsafe(`DELETE FROM shift_overrides WHERE id = ?`, id);
      }
    } else {
      await prisma.$executeRawUnsafe(`DELETE FROM shift_overrides WHERE id = ?`, id);
    }

    // Auto-reprocess attendance for affected range
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

    revalidatePath('/dashboard/attendance/shifts');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');

    return { success: true, message: 'Shift override deleted and attendance recalculated!' };
  } catch (error: any) {
    console.error('Delete shift override error:', error);
    return { success: false, message: error.message || 'Failed to delete shift override' };
  }
}
