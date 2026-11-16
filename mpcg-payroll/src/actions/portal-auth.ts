'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { otpMap } from '@/lib/otpStore';
import {
  sendGupshupWhatsApp,
  sendGupshupTemplate,
  getWhatsAppSettings,
} from '@/lib/whatsapp';

const PORTAL_SECRET =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  'mpcg-portal-secure-salt-2026-clinic';

export interface PortalSessionEmployee {
  id: string;
  employeeId: string;
  name: string;
  mobile: string | null;
  email: string | null;
  designation: string | null;
  department: string | null;
  branch: string | null;
  shiftStartTime: string | null;
  shiftEndTime: string | null;
  standardWorkingHours: any;
  joiningDate: Date | null;
  status: string;
}

/**
 * Clean phone or ID
 */
function cleanIdentifier(idStr: string) {
  return idStr.trim();
}

/**
 * Request WhatsApp OTP for Employee Self-Service Portal Login
 */
export async function requestPortalOtp(identifier: string): Promise<{
  success: boolean;
  message: string;
  demoOtp?: string;
  targetMobile?: string;
}> {
  if (!identifier || !identifier.trim()) {
    return {
      success: false,
      message: 'Please enter your registered Mobile Number or Employee ID.',
    };
  }

  const raw = identifier.trim();
  const digitsOnly = raw.replace(/\D/g, '');

  // 1. Search for matching active employee
  // Match by exact mobile (last 10 digits), or employeeId (case insensitive), or biometricId
  const orConditions: any[] = [
    { employeeId: { equals: raw, mode: 'insensitive' } },
    { employeeId: { equals: `MPC-${raw}`, mode: 'insensitive' } },
  ];

  if (digitsOnly.length >= 1) {
    orConditions.push({ biometricId: digitsOnly });
    orConditions.push({ employeeId: { equals: `MPC-${digitsOnly}`, mode: 'insensitive' } });
  }

  if (digitsOnly.length >= 10) {
    const last10 = digitsOnly.slice(-10);
    orConditions.push({ mobile: { contains: last10 } });
  }

  const employees = await prisma.employee.findMany({
    where: {
      status: 'ACTIVE',
      OR: orConditions,
    },
    take: 5,
  });

  if (!employees || employees.length === 0) {
    return {
      success: false,
      message: `No active employee found for "${raw}". Please enter your registered Mobile Number (e.g. 9876543210) or Employee ID (e.g. MPC-175).`,
    };
  }

  // Pick best matching employee
  const employee = employees[0];

  if (!employee.mobile || employee.mobile.replace(/\D/g, '').length < 10) {
    return {
      success: false,
      message: `Employee "${employee.name}" (${employee.employeeId}) has no registered mobile number in the system. Please ask HR to update your mobile number.`,
    };
  }

  const cleanMobile = employee.mobile.replace(/\D/g, '').slice(-10);

  // 2. Generate 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  // Store in global otpMap under multiple keys for easy lookup
  const record = { otp: otpCode, expiresAt, employeeId: employee.id };
  otpMap.set(cleanMobile, record);
  otpMap.set(employee.id, record);
  otpMap.set(employee.employeeId.toUpperCase(), record);
  otpMap.set(raw.toUpperCase(), record);
  if (digitsOnly) otpMap.set(digitsOnly, record);

  // 3. Send via WhatsApp Gupshup
  const messageText = `MY PAIN CLINIC GLOBAL - EMPLOYEE PORTAL\n\nHello ${employee.name},\nYour WhatsApp Login OTP is: ${otpCode}\n\nThis OTP is valid for 10 minutes. Do not share this code with anyone.`;

  const settings = await getWhatsAppSettings();

  let waRes: { success: boolean; message: string; data?: any };
  if (settings.useTemplate && settings.templateIdOtp) {
    waRes = await sendGupshupTemplate(cleanMobile, settings.templateIdOtp, [otpCode]);
  } else {
    waRes = await sendGupshupWhatsApp(cleanMobile, messageText);
  }

  const maskedNumber = `+91 ******${cleanMobile.slice(-4)}`;

  if (waRes.success) {
    return {
      success: true,
      message: `OTP sent via WhatsApp to ${maskedNumber} for ${employee.name}!`,
      targetMobile: maskedNumber,
    };
  } else {
    // Gupshup failed (e.g. API credentials or sandbox), return demoOtp so login is never blocked
    console.warn('Gupshup portal OTP dispatch warning:', waRes.message);
    return {
      success: true,
      message: `OTP generated for ${employee.name}. ${waRes.message}. (For Testing, your OTP is: ${otpCode})`,
      demoOtp: otpCode,
      targetMobile: maskedNumber,
    };
  }
}

/**
 * Verify OTP and establish secure 30-day employee portal session cookie
 */
export async function verifyPortalOtp(
  identifier: string,
  enteredOtp: string
): Promise<{ success: boolean; message: string; employee?: PortalSessionEmployee }> {
  if (!identifier || !enteredOtp) {
    return { success: false, message: 'Please provide both your ID/mobile and the 6-digit OTP.' };
  }

  const raw = identifier.trim();
  const digitsOnly = raw.replace(/\D/g, '');
  const cleanEnteredOtp = enteredOtp.trim();

  // Check stored OTP record
  const record =
    otpMap.get(raw.toUpperCase()) ||
    otpMap.get(cleanMobileLookup(raw)) ||
    (digitsOnly ? otpMap.get(digitsOnly) : undefined);

  if (!record) {
    return {
      success: false,
      message: 'No active OTP request found. Please click "Send WhatsApp OTP" first.',
    };
  }

  if (Date.now() > record.expiresAt) {
    return {
      success: false,
      message: 'OTP has expired. Please request a new WhatsApp OTP.',
    };
  }

  if (record.otp !== cleanEnteredOtp) {
    return {
      success: false,
      message: 'Incorrect OTP. Please enter the valid 6-digit code received on WhatsApp.',
    };
  }

  // Clear OTP to prevent replay
  if (digitsOnly) otpMap.delete(digitsOnly);
  otpMap.delete(raw.toUpperCase());
  if (record.employeeId) otpMap.delete(record.employeeId);

  // Fetch employee details
  const employee = await prisma.employee.findFirst({
    where: {
      id: record.employeeId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      employeeId: true,
      name: true,
      mobile: true,
      email: true,
      designation: true,
      department: true,
      branch: true,
      shiftStartTime: true,
      shiftEndTime: true,
      standardWorkingHours: true,
      joiningDate: true,
      status: true,
    },
  });

  if (!employee) {
    return { success: false, message: 'Employee profile not found or inactive.' };
  }

  // Generate signed session cookie
  const payload = {
    employeeId: employee.id,
    employeeCode: employee.employeeId,
    name: employee.name,
    mobile: employee.mobile || '',
    iat: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', PORTAL_SECRET)
    .update(payloadB64)
    .digest('hex');
  const sessionToken = `${payloadB64}.${signature}`;

  // Set HTTP-only persistent cookie
  const cookieStore = await cookies();
  cookieStore.set('mpcg_portal_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 24 * 60 * 60, // 30 days persistent login
  });

  return {
    success: true,
    message: `Welcome back, ${employee.name}!`,
    employee: {
      ...employee,
      standardWorkingHours: Number(employee.standardWorkingHours),
    },
  };
}

function cleanMobileLookup(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

/**
 * Get current portal session employee from cookie
 */
export async function getPortalSession(): Promise<PortalSessionEmployee | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('mpcg_portal_session')?.value;
    if (!token) return null;

    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', PORTAL_SECRET)
      .update(payloadB64)
      .digest('hex');

    if (signature !== expectedSig) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.employeeId) return null;

    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mobile: true,
        email: true,
        designation: true,
        department: true,
        branch: true,
        shiftStartTime: true,
        shiftEndTime: true,
        standardWorkingHours: true,
        joiningDate: true,
        status: true,
      },
    });

    if (!employee || employee.status !== 'ACTIVE') return null;

    return {
      ...employee,
      standardWorkingHours: Number(employee.standardWorkingHours),
    };
  } catch (error) {
    console.error('getPortalSession error:', error);
    return null;
  }
}

/**
 * Logout from employee portal
 */
export async function logoutPortal(): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('mpcg_portal_session');
    return { success: true };
  } catch {
    return { success: false };
  }
}
