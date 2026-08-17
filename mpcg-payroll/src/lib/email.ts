import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';

export interface SMTPSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

const DEFAULT_SMTP: SMTPSettings = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === 'true' || true,
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  fromName: process.env.SMTP_FROM_NAME || 'MY PAIN CLINIC GLOBAL Payroll',
  fromEmail: process.env.SMTP_FROM_EMAIL || 'payroll@mypainclinicglobal.com',
};

/**
 * Fetch SMTP settings from database payroll_settings or .env fallback
 */
export async function getSMTPSettings(): Promise<SMTPSettings> {
  try {
    const setting = await prisma.payrollSetting.findUnique({
      where: { key: 'smtp_email_config' },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      return { ...DEFAULT_SMTP, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load SMTP settings:', error);
  }
  return DEFAULT_SMTP;
}

/**
 * Create Nodemailer Transporter
 */
export async function createEmailTransporter() {
  const settings = await getSMTPSettings();

  if (!settings.user || !settings.pass) {
    throw new Error('SMTP credentials (user/password) are not configured in settings.');
  }

  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.port === 465 || settings.secure,
    auth: {
      user: settings.user,
      pass: settings.pass,
    },
  });
}

/**
 * Send Salary Slip Email with PDF attachment
 */
export async function sendSalarySlipEmail(params: {
  employeeName: string;
  employeeEmail: string;
  monthName: string;
  year: number;
  pdfBuffer: Buffer;
  fileName: string;
}): Promise<{ success: boolean; message: string }> {
  if (!params.employeeEmail || params.employeeEmail.trim() === '') {
    return { success: false, message: `Employee "${params.employeeName}" does not have an email address.` };
  }

  try {
    const settings = await getSMTPSettings();
    const transporter = await createEmailTransporter();

    const subject = `Salary Slip - ${params.employeeName} - ${params.monthName} ${params.year} | MY PAIN CLINIC GLOBAL`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <div style="text-align: center; border-bottom: 2px solid #123B6D; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #123B6D; margin: 0; font-size: 20px;">MY PAIN CLINIC GLOBAL</h2>
          <p style="color: #64748b; margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase;">Payroll & Human Resources</p>
        </div>

        <p style="font-size: 15px; color: #1e293b;">Dear <strong>${params.employeeName}</strong>,</p>

        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Please find attached your official Salary Slip for the month of <strong>${params.monthName} ${params.year}</strong>.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #06b6d4; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 13px; color: #0f172a;">
            📄 <strong>Attachment:</strong> <code>${params.fileName}</code>
          </p>
        </div>

        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          If you have any questions regarding your salary computation or tax deductions, please reach out to the HR / Accounts department.
        </p>

        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #cbd5e1; text-align: center; font-size: 11px; color: #94a3b8;">
          <p style="margin: 0;">This is an automated system email. Please do not reply directly to this email.</p>
          <p style="margin: 4px 0 0 0;">© ${params.year} MY PAIN CLINIC GLOBAL. All rights reserved.</p>
        </div>
      </div>
    `;

    // For standard Gmail accounts, sender address must match authenticated user
    const senderEmail = settings.user.toLowerCase().endsWith('@gmail.com')
      ? settings.user
      : (settings.fromEmail || settings.user);

    await transporter.sendMail({
      from: `"${settings.fromName}" <${senderEmail}>`,
      to: params.employeeEmail,
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: params.fileName,
          content: params.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return { success: true, message: `Salary slip emailed successfully to ${params.employeeEmail}` };
  } catch (error: any) {
    console.error(`Failed to send salary slip email to ${params.employeeEmail}:`, error);
    return { success: false, message: error.message || 'Failed to send salary slip email' };
  }
}
