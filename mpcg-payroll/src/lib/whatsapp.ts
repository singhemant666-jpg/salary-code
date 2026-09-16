import { prisma } from '@/lib/prisma';

export interface WhatsAppNotificationPayload {
  employeeName: string;
  mobile: string;
  type: 'LOGIN' | 'LOGOUT';
  dateStr: string;
  timeStr: string;
  workingHours?: number;
  lateMinutes?: number;
  shiftStartTime?: string;
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
  templateIdOtp?: string;
}

const DEFAULT_SETTINGS: WhatsAppSettings = {
  enabled: false,
  apiKey: '',
  appName: '',
  sourceNumber: '',
  notifyLogin: true,
  notifyLogout: true,
  useTemplate: true,
  templateIdLogin: 'employee_checkin_alert',
  templateIdLogout: 'attendance_logout_alert',
  templateIdOtp: '',
};

function calculateLateMinutes(timeStr: string, shiftStartStr?: string): number {
  if (!timeStr || !shiftStartStr) return 0;
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
  if (!match) return 0;

  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[4]?.toUpperCase();

  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;

  const punchMins = h * 60 + m;

  const [sh, sm] = shiftStartStr.split(':').map(Number);
  const shiftMins = sh * 60 + (sm || 0);

  return punchMins > shiftMins ? punchMins - shiftMins : 0;
}

/**
 * Fetch WhatsApp Gupshup configuration from payroll_settings table
 */
export async function getWhatsAppSettings(): Promise<WhatsAppSettings> {
  let settings: WhatsAppSettings = { ...DEFAULT_SETTINGS };

  try {
    const setting = await prisma.payrollSetting.findUnique({
      where: { key: 'whatsapp_gupshup_config' },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      settings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load WhatsApp settings:', error);
  }

  // Priority override: Use environment variable for sensitive API Key if set
  if (process.env.GUPSHUP_API_KEY && process.env.GUPSHUP_API_KEY.trim() !== '') {
    settings.apiKey = process.env.GUPSHUP_API_KEY.trim();
  }

  return settings;
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

// In-memory cache to prevent duplicate WhatsApp notifications
// Key: mobile_type_dateStr or mobile
const sentNotificationCache = new Map<string, number>();

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

  const cleanMobile = payload.mobile.replace(/[^0-9]/g, '');
  const now = Date.now();

  // 1. DEDUPLICATION RULE 1: Only ONE LOGIN alert per employee per day
  if (payload.type === 'LOGIN') {
    const loginKey = `LOGIN_${cleanMobile}_${payload.dateStr}`;
    if (sentNotificationCache.has(loginKey)) {
      console.log(`[WhatsApp Guard] Skipped duplicate LOGIN alert for ${payload.employeeName} (${cleanMobile}) on ${payload.dateStr}`);
      return { success: true, message: 'Skipped duplicate LOGIN notification for today' };
    }
  }

  // 2. DEDUPLICATION RULE 2: Suppress LOGOUT alerts if working hours are negligible (< 0.25 hrs / 15 mins)
  if (payload.type === 'LOGOUT' && (payload.workingHours || 0) < 0.25) {
    console.log(`[WhatsApp Guard] Skipped LOGOUT alert for ${payload.employeeName} (${cleanMobile}) because working hours < 15 mins (${payload.workingHours} hrs)`);
    return { success: true, message: 'Skipped LOGOUT notification (punch within 15 minutes of login)' };
  }

  // 3. DEDUPLICATION RULE 3: Cooldown Window - Max 1 message per 10 minutes to the same mobile number for LOGOUT
  if (payload.type === 'LOGOUT') {
    const lastLogoutKey = `LOGOUT_${cleanMobile}`;
    const lastSentTime = sentNotificationCache.get(lastLogoutKey) || 0;
    const cooldownMs = 10 * 60 * 1000; // 10 minutes cooldown

    if (now - lastSentTime < cooldownMs) {
      const waitMins = Math.ceil((cooldownMs - (now - lastSentTime)) / 60000);
      console.log(`[WhatsApp Guard] Cooldown active for ${payload.employeeName} (${cleanMobile}). Skipped duplicate LOGOUT alert (${waitMins}m remaining).`);
      return { success: true, message: `Skipped LOGOUT notification (10m cooldown active, ${waitMins}m remaining)` };
    }
  }

  const lateMins = payload.lateMinutes ?? calculateLateMinutes(payload.timeStr, payload.shiftStartTime);
  const lateStr = lateMins > 0 ? `Late (${lateMins} mins)` : 'On Time';

  let result: { success: boolean; message: string; data?: any };

  // If user configured Gupshup Approved Templates
  if (settings.useTemplate) {
    const templateId = payload.type === 'LOGIN'
      ? (settings.templateIdLogin?.trim() || 'employee_checkin_alert')
      : (settings.templateIdLogout?.trim() || 'attendance_logout_alert');

    const workingHrsStr = `${(payload.workingHours || 0).toFixed(1)} hrs`;

    if (templateId && templateId.trim() !== '') {
      const templateParams = payload.type === 'LOGIN'
        ? [payload.employeeName, payload.dateStr, payload.timeStr, lateStr]
        : [payload.employeeName, payload.dateStr, payload.timeStr, workingHrsStr];
      result = await sendGupshupTemplate(payload.mobile, templateId, templateParams);
    } else {
      result = await sendFallbackText();
    }
  } else {
    result = await sendFallbackText();
  }

  // If successfully sent or submitted, record in cache
  if (result.success) {
    if (payload.type === 'LOGIN') {
      sentNotificationCache.set(`LOGIN_${cleanMobile}_${payload.dateStr}`, now);
    } else if (payload.type === 'LOGOUT') {
      sentNotificationCache.set(`LOGOUT_${cleanMobile}`, now);
    }
  }

  return result;

  async function sendFallbackText() {
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
}

