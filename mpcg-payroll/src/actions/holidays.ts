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

    revalidatePath('/dashboard/settings/holidays');
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

    revalidatePath('/dashboard/settings/holidays');
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

    revalidatePath('/dashboard/settings/holidays');
    return { success: true, message: 'Holiday deleted successfully' };
  } catch (error) {
    console.error('Delete holiday error:', error);
    return { success: false, message: 'Failed to delete holiday' };
  }
}
