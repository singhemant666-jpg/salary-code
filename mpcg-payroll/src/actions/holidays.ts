'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';
import { revalidatePath } from 'next/cache';

export interface ActionResult {
  success: boolean;
  message: string;
}

export async function createHoliday(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const name = formData.get('name') as string;
  const dateStr = formData.get('date') as string;
  const isOptional = formData.get('isOptional') === 'true';

  if (!name || !dateStr) {
    return { success: false, message: 'Name and Date are required' };
  }

  try {
    const holidayDate = new Date(dateStr);

    const existing = await prisma.holiday.findUnique({
      where: { date: holidayDate },
    });

    if (existing) {
      return { success: false, message: 'A holiday already exists on this date' };
    }

    const holiday = await prisma.holiday.create({
      data: {
        name: name.trim(),
        date: holidayDate,
        isOptional,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'CREATE',
      entity: 'Holiday',
      entityId: holiday.id,
      newValue: { name, date: dateStr, isOptional },
    });

    await syncHolidaysToDailyAttendance();

    revalidatePath('/dashboard/settings/holidays');
    revalidatePath('/dashboard/attendance');
    return { success: true, message: 'Holiday created successfully' };
  } catch (error) {
    console.error('Create holiday error:', error);
    return { success: false, message: 'Failed to create holiday' };
  }
}

export async function updateHoliday(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  const name = formData.get('name') as string;
  const dateStr = formData.get('date') as string;
  const isOptional = formData.get('isOptional') === 'true';

  if (!name || !dateStr) {
    return { success: false, message: 'Name and Date are required' };
  }

  try {
    const holidayDate = new Date(dateStr);

    const existing = await prisma.holiday.findFirst({
      where: {
        date: holidayDate,
        NOT: { id },
      },
    });

    if (existing) {
      return { success: false, message: 'Another holiday already exists on this date' };
    }

    const oldHoliday = await prisma.holiday.findUnique({ where: { id } });

    await prisma.holiday.update({
      where: { id },
      data: {
        name: name.trim(),
        date: holidayDate,
        isOptional,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'UPDATE',
      entity: 'Holiday',
      entityId: id,
      oldValue: oldHoliday,
      newValue: { name, date: dateStr, isOptional },
    });

    await syncHolidaysToDailyAttendance();

    revalidatePath('/dashboard/settings/holidays');
    revalidatePath('/dashboard/attendance');
    return { success: true, message: 'Holiday updated successfully' };
  } catch (error) {
    console.error('Update holiday error:', error);
    return { success: false, message: 'Failed to update holiday' };
  }
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) return { success: false, message: 'Unauthorized' };

  try {
    const oldHoliday = await prisma.holiday.findUnique({ where: { id } });

    await prisma.holiday.delete({ where: { id } });

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'DELETE',
      entity: 'Holiday',
      entityId: id,
      oldValue: oldHoliday,
    });

    await syncHolidaysToDailyAttendance();

    revalidatePath('/dashboard/settings/holidays');
    revalidatePath('/dashboard/attendance');
    return { success: true, message: 'Holiday deleted successfully' };
  } catch (error) {
    console.error('Delete holiday error:', error);
    return { success: false, message: 'Failed to delete holiday' };
  }
}

export async function syncHolidaysToDailyAttendance(): Promise<{ success: boolean; count: number }> {
  try {
    const holidays = await prisma.holiday.findMany({
      where: { isOptional: false }
    });

    let totalUpdated = 0;
    for (const h of holidays) {
      const dateStr = h.date.toISOString().split('T')[0];
      const [year, month, day] = dateStr.split('-').map(Number);
      
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

      const res = await prisma.attendanceDaily.updateMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay },
          OR: [
            { status: 'ABSENT' },
            { workingHours: 0 }
          ]
        },
        data: {
          status: 'HOLIDAY',
          remarks: h.name
        }
      });

      totalUpdated += res.count;
    }

    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/payroll');
    return { success: true, count: totalUpdated };
  } catch (error) {
    console.error('Failed to sync holidays to daily attendance:', error);
    return { success: false, count: 0 };
  }
}
