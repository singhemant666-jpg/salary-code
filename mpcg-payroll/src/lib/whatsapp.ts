import { prisma } from '@/lib/prisma';

export interface WhatsAppNotificationPayload {
  employeeName: string;
  mobile: string;
  type: 'LOGIN' | 'LOGOUT';
  dateStr: string;
  timeStr: string;
  workingHours?: number;
  lateMinutes?: number;
  companyName?: string;
}

export interface WhatsAppSettings {
  enabled: boolean;
  apiKey: string;
  appName: string;
  sourceNumber: string;
  notifyLogin: boolean;
  notifyLogout: boolean;
  useTemplate: boolean;
  templateIdLogin: string;
  templateIdLogout: string;
}

const DEFAULT_SETTINGS: WhatsAppSettings = {
  enabled: false,
  apiKey: '',
  appName: '',
  sourceNumber: '',
  notifyLogin: true,
  notifyLogout: true,
  useTemplate: false,
  templateIdLogin: '',
  templateIdLogout: '',
};

function calculateLateMinutes(timeStr: string, shiftStartStr: string = '10:00'): number {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return 0;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[4]?.toUpperCase();

  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  const punchMins = h * 60 + m;

  const [sh, sm] = shiftStartStr.split(':').map(Number);
  const shiftMins = (sh || 10) * 60 + (sm || 0);

  return punchMins > shiftMins ? punchMins - shiftMins : 0;
}

/**
 * Fetch WhatsApp Gupshup configuration from payroll_settings table
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  try {
    const setting = await prisma.payrollSetting.findUnique({
      where: { key: 'whatsapp_gupshup_config' },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load WhatsApp settings:', error);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Send raw WhatsApp text message via Gupshup API
 */
export async function sendGupshupWhatsApp(toMobile: string, messageText: string): Promise<{ success: boolean; message: string; data?: any }> {
  const settings = await getWhatsAppSettings();

  if (!settings.enabled) {
    return { success: false, message: 'WhatsApp notifications are disabled in settings.' };
  }

  if (!settings.apiKey || !settings.sourceNumber) {
    return { success: false, message: 'Gupshup API Key or Source Phone Number is missing in settings.' };
  }

  // Format mobile number: Ensure Indian country code prefix 91 if 10 digits
  let formattedNumber = toMobile.replace(/[^0-9]/g, '');
  if (formattedNumber.length === 10) {
    formattedNumber = '91' + formattedNumber;
  }

  try {
    const params = new URLSearchParams();
    params.append('channel', 'whatsapp');
    params.append('source', settings.sourceNumber.replace(/[^0-9]/g, ''));
    params.append('destination', formattedNumber);
    params.append('message', JSON.stringify({ type: 'text', text: messageText }));
    if (settings.appName) {
      params.append('src.name', settings.appName);
    }

    const response = await fetch('https://api.gupshup.io/wa/api/v1/msg', {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': settings.apiKey,
      },
      body: params.toString(),
    });

    const resData = await response.json().catch(() => ({}));

    if (response.ok && (resData.status === 'submitted' || resData.status === 'success')) {
      return { success: true, message: 'WhatsApp message sent successfully via Gupshup!', data: resData };
    } else {
      return {
        success: false,
        message: resData.message || resData.error || `Gupshup API returned status ${response.status}`,
        data: resData,
      };
    }
  } catch (error: any) {
    console.error('Gupshup WhatsApp API Exception:', error);
    return { success: false, message: error.message || 'Network error connecting to Gupshup API' };
  }
}

/**
 * Send WhatsApp Template Message via Gupshup Template API
 */
export async function sendGupshupTemplate(
  toMobile: string,
  templateId: string,
  paramsList: string[]
): Promise<{ success: boolean; message: string; data?: any }> {
  const settings = await getWhatsAppSettings();

  if (!settings.enabled) {
    return { success: false, message: 'WhatsApp notifications are disabled in settings.' };
  }

  if (!settings.apiKey || !settings.sourceNumber) {
    return { success: false, message: 'Gupshup API Key or Source Phone Number is missing.' };
  }

  let formattedNumber = toMobile.replace(/[^0-9]/g, '');
  if (formattedNumber.length === 10) {
    formattedNumber = '91' + formattedNumber;
  }

  try {
    const params = new URLSearchParams();
    params.append('channel', 'whatsapp');
    params.append('source', settings.sourceNumber.replace(/[^0-9]/g, ''));
    params.append('destination', formattedNumber);
    params.append('template', JSON.stringify({ id: templateId, params: paramsList }));
    if (settings.appName) {
      params.append('src.name', settings.appName);
    }

    const response = await fetch('https://api.gupshup.io/wa/api/v1/template/msg', {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apikey': settings.apiKey,
      },
      body: params.toString(),
    });

    const resData = await response.json().catch(() => ({}));

    if (response.ok && (resData.status === 'submitted' || resData.status === 'success')) {
      return { success: true, message: 'WhatsApp Template Message sent successfully via Gupshup!', data: resData };
    } else {
      return {
        success: false,
        message: resData.message || resData.error || `Gupshup API returned status ${response.status}`,
        data: resData,
      };
    }
  } catch (error: any) {
    console.error('Gupshup WhatsApp Template API Exception:', error);
    return { success: false, message: error.message || 'Network error connecting to Gupshup API' };
  }
}

/**
 * Format and send automated Check-in (Login) or Check-out (Logout) WhatsApp Notification
 */
export async function sendAttendanceWhatsAppNotification(payload: WhatsAppNotificationPayload): Promise<{ success: boolean; message: string }> {
  const settings = await getWhatsAppSettings();

  if (!settings.enabled) {
    return { success: false, message: 'WhatsApp notifications disabled' };
  }

  if (payload.type === 'LOGIN' && !settings.notifyLogin) {
    return { success: false, message: 'Login notifications disabled' };
  }

  if (payload.type === 'LOGOUT' && !settings.notifyLogout) {
    return { success: false, message: 'Logout notifications disabled' };
  }

  if (!payload.mobile || payload.mobile.trim() === '') {
    return { success: false, message: 'Employee has no mobile number' };
  }

  const lateMins = payload.lateMinutes ?? calculateLateMinutes(payload.timeStr);
  const lateStr = lateMins > 0 ? `${lateMins} mins late` : 'On Time';

  // If user configured Gupshup Approved Templates
  if (settings.useTemplate) {
    const templateId = payload.type === 'LOGIN' ? settings.templateIdLogin : settings.templateIdLogout;
    if (templateId && templateId.trim() !== '') {
      const templateParams = payload.type === 'LOGIN'
        ? [payload.employeeName, payload.dateStr, payload.timeStr]
        : [payload.employeeName, payload.dateStr, payload.timeStr, (payload.workingHours || 0).toFixed(2)];
      return sendGupshupTemplate(payload.mobile, templateId, templateParams);
    }
  }

  // Fallback to text message
  const company = payload.companyName || 'MY PAIN CLINIC GLOBAL';
  let message = '';

  if (payload.type === 'LOGIN') {
    message = `${company}\n` +
      `Hello ${payload.employeeName},\n` +
      `Your Check-in (Login) has been recorded for ${payload.dateStr}.\n` +
      `⏰ Login Time: ${payload.timeStr}\n` +
      `Have a productive day!`;
  } else {
    const hrsVal = (payload.workingHours || 0).toFixed(2);
    message = `${company}\n` +
      `Hello ${payload.employeeName},\n` +
      `Your Check-out (Logout) has been recorded for ${payload.dateStr}.\n` +
      `⏰ Logout Time: ${payload.timeStr}\n` +
      `⏱️ Working Hours: ${hrsVal} hrs\n` +
      `Thank you & have a great evening!`;
  }

  return sendGupshupWhatsApp(payload.mobile, message);
}
