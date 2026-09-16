'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getWhatsAppSettings, sendGupshupWhatsApp, WhatsAppSettings } from '@/lib/whatsapp';

export async function fetchWhatsAppConfig(): Promise<WhatsAppSettings> {
  return getWhatsAppSettings();
}

export async function saveWhatsAppConfig(config: WhatsAppSettings) {
  try {
    await prisma.payrollSetting.upsert({
      where: { key: 'whatsapp_gupshup_config' },
      update: {
        value: JSON.stringify(config),
        category: 'whatsapp',
      },
      create: {
        key: 'whatsapp_gupshup_config',
        value: JSON.stringify(config),
        category: 'whatsapp',
        description: 'Gupshup WhatsApp API Credentials & Attendance Alert Preferences',
      },
    });

    revalidatePath('/dashboard/settings/whatsapp');
    return { success: true, message: 'WhatsApp Gupshup settings saved successfully!' };
  } catch (error: any) {
    console.error('Failed to save WhatsApp config:', error);
    return { success: false, message: error.message || 'Failed to save WhatsApp settings' };
  }
}

export async function testWhatsAppMessage(targetMobile: string, type: 'LOGIN' | 'LOGOUT' = 'LOGIN') {
  if (!targetMobile) {
    return { success: false, message: 'Please enter a target mobile number to send test message' };
  }

  const { sendAttendanceWhatsAppNotification } = await import('@/lib/whatsapp');

  const todayStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return sendAttendanceWhatsAppNotification({
    employeeName: 'Test Employee',
    mobile: targetMobile,
    type,
    dateStr: todayStr,
    timeStr: type === 'LOGIN' ? '09:30 AM' : '06:30 PM',
    workingHours: 9.00,
    lateMinutes: 0,
    companyName: 'MY PAIN CLINIC GLOBAL',
  });
}
