'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export interface BroadcastNotice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  createdAt: string;
  active: boolean;
}

export interface EmployeeWarning {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  title: string;
  message: string;
  severity: 'warning' | 'urgent' | 'info';
  createdAt: string;
  active: boolean;
}

const BROADCAST_KEY = 'portal_broadcast_notices';
const WARNINGS_KEY = 'portal_employee_warnings';

/**
 * Fetch broadcast notices from payroll_settings
 */
export async function getBroadcastNotices(): Promise<BroadcastNotice[]> {
  try {
    const row = await prisma.payrollSetting.findUnique({
      where: { key: BROADCAST_KEY },
    });
    if (!row || !row.value) return [];
    return JSON.parse(row.value) as BroadcastNotice[];
  } catch (error) {
    console.error('Error fetching broadcast notices:', error);
    return [];
  }
}

/**
 * Fetch warnings from payroll_settings
 */
export async function getEmployeeWarnings(): Promise<EmployeeWarning[]> {
  try {
    const row = await prisma.payrollSetting.findUnique({
      where: { key: WARNINGS_KEY },
    });
    if (!row || !row.value) return [];
    return JSON.parse(row.value) as EmployeeWarning[];
  } catch (error) {
    console.error('Error fetching employee warnings:', error);
    return [];
  }
}

/**
 * Get active notices & warnings for a logged-in employee in the portal
 */
export async function getPortalNoticesForEmployee(employeeId: string) {
  const [broadcasts, allWarnings] = await Promise.all([
    getBroadcastNotices(),
    getEmployeeWarnings(),
  ]);

  const activeBroadcasts = broadcasts.filter((b) => b.active);
  const myWarnings = allWarnings.filter(
    (w) => w.employeeId === employeeId && w.active
  );

  return {
    broadcasts: activeBroadcasts,
    warnings: myWarnings,
  };
}

/**
 * Admin: Create a new company broadcast notice
 */
export async function createBroadcastNotice(data: {
  title: string;
  content: string;
  type?: 'info' | 'warning' | 'success' | 'alert';
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized. HR login required.' };
    }

    if (!data.title || !data.content) {
      return { success: false, message: 'Title and content are required.' };
    }

    const current = await getBroadcastNotices();
    const newNotice: BroadcastNotice = {
      id: `bc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: data.title.trim(),
      content: data.content.trim(),
      type: data.type || 'info',
      createdAt: new Date().toISOString(),
      active: true,
    };

    const updated = [newNotice, ...current];

    await prisma.payrollSetting.upsert({
      where: { key: BROADCAST_KEY },
      create: {
        key: BROADCAST_KEY,
        value: JSON.stringify(updated),
        description: 'Company-wide updates and announcements displayed on employee portal',
        category: 'portal',
      },
      update: {
        value: JSON.stringify(updated),
      },
    });

    revalidatePath('/portal');
    revalidatePath('/dashboard/settings/notices');
    return { success: true, message: 'Broadcast announcement published successfully!' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to publish broadcast.' };
  }
}

/**
 * Admin: Delete a broadcast notice
 */
export async function deleteBroadcastNotice(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized. HR login required.' };
    }

    const current = await getBroadcastNotices();
    const filtered = current.filter((b) => b.id !== id);

    await prisma.payrollSetting.upsert({
      where: { key: BROADCAST_KEY },
      create: {
        key: BROADCAST_KEY,
        value: JSON.stringify(filtered),
        description: 'Company-wide updates and announcements displayed on employee portal',
        category: 'portal',
      },
      update: {
        value: JSON.stringify(filtered),
      },
    });

    revalidatePath('/portal');
    revalidatePath('/dashboard/settings/notices');
    return { success: true, message: 'Notice deleted.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to delete notice.' };
  }
}

/**
 * Admin: Issue an employee warning / notice
 */
export async function createEmployeeWarning(data: {
  employeeId: string;
  title: string;
  message: string;
  severity?: 'warning' | 'urgent' | 'info';
}): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized. HR login required.' };
    }

    if (!data.employeeId || !data.title || !data.message) {
      return { success: false, message: 'Employee, Title, and Message are required.' };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: data.employeeId },
      select: { id: true, employeeId: true, name: true },
    });

    if (!employee) {
      return { success: false, message: 'Employee not found.' };
    }

    const current = await getEmployeeWarnings();
    const newWarning: EmployeeWarning = {
      id: `wrn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      employeeId: employee.id,
      employeeCode: employee.employeeId,
      employeeName: employee.name,
      title: data.title.trim(),
      message: data.message.trim(),
      severity: data.severity || 'warning',
      createdAt: new Date().toISOString(),
      active: true,
    };

    const updated = [newWarning, ...current];

    await prisma.payrollSetting.upsert({
      where: { key: WARNINGS_KEY },
      create: {
        key: WARNINGS_KEY,
        value: JSON.stringify(updated),
        description: 'Personalized employee warnings and compliance notices',
        category: 'portal',
      },
      update: {
        value: JSON.stringify(updated),
      },
    });

    revalidatePath('/portal');
    revalidatePath('/dashboard/settings/notices');
    return {
      success: true,
      message: `Notice/Warning issued to ${employee.name} (${employee.employeeId})!`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to issue warning.' };
  }
}

/**
 * Admin: Delete or Dismiss an employee warning
 */
export async function deleteEmployeeWarning(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, message: 'Unauthorized. HR login required.' };
    }

    const current = await getEmployeeWarnings();
    const filtered = current.filter((w) => w.id !== id);

    await prisma.payrollSetting.upsert({
      where: { key: WARNINGS_KEY },
      create: {
        key: WARNINGS_KEY,
        value: JSON.stringify(filtered),
        description: 'Personalized employee warnings and compliance notices',
        category: 'portal',
      },
      update: {
        value: JSON.stringify(filtered),
      },
    });

    revalidatePath('/portal');
    revalidatePath('/dashboard/settings/notices');
    return { success: true, message: 'Warning cleared successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to clear warning.' };
  }
}
