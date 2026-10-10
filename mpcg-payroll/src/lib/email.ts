import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { formatINR } from '@/lib/currency-utils';

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
  let settings: SMTPSettings = { ...DEFAULT_SMTP };

  try {
    const setting = await prisma.payrollSetting.findUnique({
      where: { key: 'smtp_email_config' },
    });
    if (setting && setting.value) {
      const parsed = JSON.parse(setting.value);
      settings = { ...DEFAULT_SMTP, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load SMTP settings:', error);
  }

  // Fallback to process.env.SMTP_PASS only if DB password is missing
  if ((!settings.pass || settings.pass.trim() === '') && process.env.SMTP_PASS && process.env.SMTP_PASS.trim() !== '') {
    settings.pass = process.env.SMTP_PASS.trim();
  }

  return settings;
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

export interface SalarySlipEmailParams {
  employeeName: string;
  employeeEmail: string;
  employeeId?: string;
  designation?: string;
  department?: string;
  monthName: string;
  year: number;
  paidDays?: number;
  lopDays?: number;
  grossSalary?: number;
  totalDeduction?: number;
  netSalary?: number;
  bankName?: string;
  accountNumber?: string;
  pdfBuffer: Buffer;
  fileName: string;
}

/**
 * Send Salary Slip Email with PDF attachment and company logo
 */
export async function sendSalarySlipEmail(params: SalarySlipEmailParams): Promise<{ success: boolean; message: string }> {
  if (!params.employeeEmail || params.employeeEmail.trim() === '') {
    return { success: false, message: `Employee "${params.employeeName}" does not have an email address.` };
  }

  try {
    const settings = await getSMTPSettings();
    const transporter = await createEmailTransporter();

    const logoUrl = 'https://mypainclinicglobal.com/wp-content/uploads/2025/08/logo-mpc.jpg';

    const subject = `Official Salary Slip - ${params.employeeName} (${params.monthName} ${params.year}) | MY PAIN CLINIC GLOBAL`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Salary Slip - ${params.employeeName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Arial, sans-serif !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Roboto', -apple-system, BlinkMacSystemFont, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 32px 16px; font-family: 'Roboto', Arial, sans-serif;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0; font-family: 'Roboto', Arial, sans-serif;">
          
          <!-- Brand Header with Premium Navy Gradient & Company Logo -->
          <tr>
            <td style="background: linear-gradient(135deg, #091e36 0%, #123b6d 55%, #1e528e 100%); background-color: #123b6d; padding: 28px 24px 24px; text-align: center;">
              <div style="margin-bottom: 12px; text-align: center;">
                <img src="${logoUrl}" alt="MY PAIN CLINIC GLOBAL" width="70" height="70" style="display: inline-block; width: 70px; height: 70px; border-radius: 12px; border: 1.5px solid rgba(255, 255, 255, 0.25); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25); vertical-align: middle; background-color: #0b2545;" />
              </div>
              <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 20px; padding: 4px 14px; margin-bottom: 10px;">
                <span style="color: #67e8f9; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-family: 'Roboto', Arial, sans-serif;">
                  ✦ Official Payroll Advice
                </span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.04em; line-height: 1.3; font-family: 'Roboto', Arial, sans-serif;">
                MY PAIN CLINIC GLOBAL
              </h1>
              <p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; font-family: 'Roboto', Arial, sans-serif;">
                ADVANCED PHYSIOTHERAPY AND WELLNESS CLINIC
              </p>
            </td>
          </tr>

          <!-- Body Content Area -->
          <tr>
            <td style="padding: 28px 30px 22px; font-family: 'Roboto', Arial, sans-serif;">
              <!-- Greeting -->
              <p style="margin: 0 0 10px; font-size: 16px; color: #1e293b; font-weight: 500; font-family: 'Roboto', Arial, sans-serif;">
                Dear <strong style="color: #0f172a; font-weight: 700;">${params.employeeName}</strong>,
              </p>
              <p style="margin: 0 0 22px; font-size: 14px; line-height: 1.6; color: #475569; font-family: 'Roboto', Arial, sans-serif;">
                Greetings! Please find your official Salary Slip for the month of <strong style="color: #0f172a;">${params.monthName} ${params.year}</strong> attached below along with the summary.
              </p>

              <!-- Net Salary Highlight Card -->
              ${params.netSalary !== undefined ? `
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #e8f9f0 100%); border: 1.5px solid #86efac; border-radius: 10px; padding: 18px 22px; margin-bottom: 22px; text-align: center; font-family: 'Roboto', Arial, sans-serif;">
                <div style="font-size: 11px; font-weight: 700; color: #15803d; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 4px; font-family: 'Roboto', Arial, sans-serif;">
                  Net Payable Salary
                </div>
                <div style="font-size: 30px; font-weight: 800; color: #047857; line-height: 1.15; margin-bottom: 6px; font-family: 'Roboto', Arial, sans-serif;">
                  ${formatINR(params.netSalary)}
                </div>
                <div style="display: inline-block; background-color: #dcfce7; color: #166534; font-size: 11px; font-weight: 700; padding: 3px 12px; border-radius: 12px; border: 1px solid #bbf7d0; font-family: 'Roboto', Arial, sans-serif;">
                  ✓ Processed &amp; Disbursed
                </div>
              </div>
              ` : ''}

              <!-- Employee & Pay Details Grid -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 22px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; font-family: 'Roboto', Arial, sans-serif;">
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0; width: 50%;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Employee ID</div>
                    <div style="font-size: 14px; color: #0f172a; font-weight: 700; margin-top: 2px; font-family: monospace;">${params.employeeId || '—'}</div>
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; width: 50%;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Pay Period</div>
                    <div style="font-size: 14px; color: #0f172a; font-weight: 700; margin-top: 2px;">${params.monthName} ${params.year}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Designation</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 600; margin-top: 2px;">${params.designation || 'Staff'}</div>
                  </td>
                  <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Department</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 600; margin-top: 2px;">${params.department || 'Clinical'}</div>
                  </td>
                </tr>
                ${params.paidDays !== undefined ? `
                <tr>
                  <td style="padding: 12px 16px; border-right: 1px solid #e2e8f0;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Paid Days</div>
                    <div style="font-size: 13px; color: #0f172a; font-weight: 700; margin-top: 2px;">${params.paidDays} Days</div>
                  </td>
                  <td style="padding: 12px 16px;">
                    <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;">Leave Without Pay (LOP)</div>
                    <div style="font-size: 13px; color: ${Number(params.lopDays || 0) > 0 ? '#e11d48' : '#0f172a'}; font-weight: 700; margin-top: 2px;">${params.lopDays || 0} Days</div>
                  </td>
                </tr>
                ` : ''}
              </table>

              <!-- Attachment Box (Modern Card with PDF Badge) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0fdfa; border: 1.5px dashed #0d9488; border-radius: 8px; margin-bottom: 22px; font-family: 'Roboto', Arial, sans-serif;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="42" valign="middle" style="padding-right: 12px;">
                          <!-- PDF Icon Badge -->
                          <div style="width: 40px; height: 44px; background-color: #ef4444; border-radius: 6px; text-align: center; color: #ffffff; font-weight: 800; font-size: 11px; line-height: 44px; letter-spacing: 0.05em; box-shadow: 0 2px 6px rgba(239, 68, 68, 0.35);">
                            PDF
                          </div>
                        </td>
                        <td valign="middle">
                          <div style="font-size: 13px; font-weight: 700; color: #0f172a; word-break: break-all; font-family: monospace;">
                            ${params.fileName}
                          </div>
                          <div style="font-size: 12px; color: #0d9488; font-weight: 600; margin-top: 3px;">
                            📎 Attached to this email • Download &amp; view detailed slip
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Notice / Support Box -->
              <div style="background-color: #f8fafc; border-left: 3px solid #64748b; border-radius: 4px; padding: 12px 14px; margin-bottom: 22px;">
                <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #475569;">
                  🔒 <strong>Confidentiality Notice:</strong> This salary slip contains sensitive personal compensation information. If you have any inquiries regarding attendance or tax deductions, please contact the <strong>Accounts / Payroll Department</strong>.
                </p>
              </div>

              <!-- Sign-off -->
              <p style="margin: 0 0 3px; font-size: 13px; color: #64748b;">Warm regards,</p>
              <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">Payroll Administration</p>
              <p style="margin: 2px 0 0 0; font-size: 13px; font-weight: 600; color: #0284c7;">My Pain Clinic Global</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5; font-family: 'Roboto', Arial, sans-serif;">
              <p style="margin: 0 0 4px 0; color: #64748b; font-weight: 500;">
                This is an automated system email generated by MPCG Payroll System. Please do not reply directly to this email.
              </p>
              <p style="margin: 0; color: #94a3b8;">
                © ${params.year} MY PAIN CLINIC GLOBAL. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    // For standard Gmail accounts, sender address must match authenticated user
    const senderEmail = settings.user.toLowerCase().endsWith('@gmail.com')
      ? settings.user
      : (settings.fromEmail || settings.user);

    // Plaintext fallback (drastically improves email deliverability and avoids SpamAssassin HTML-only penalty)
    const textBody = `
Dear ${params.employeeName},

Please find attached your official Salary Slip for ${params.monthName} ${params.year}.

Summary:
- Employee ID: ${params.employeeId || '—'}
- Designation: ${params.designation || '—'}
- Paid Days: ${params.paidDays ?? '—'}
- Gross Salary: Rs. ${formatINR(params.grossSalary || 0)}
- Total Deductions: Rs. ${formatINR(params.totalDeduction || 0)}
- Net Payable Salary: Rs. ${formatINR(params.netSalary || 0)}

The detailed official salary slip is attached as a PDF (${params.fileName}).

If you have any questions regarding your attendance or payroll, please reach out to the Accounts / HR Department.

Warm regards,
Payroll Administration
MY PAIN CLINIC GLOBAL
`.trim();

    // Attach ONLY the PDF salary slip (so the logo never shows in attachments)
    const attachments: any[] = [
      {
        filename: params.fileName,
        content: params.pdfBuffer,
        contentType: 'application/pdf',
      },
    ];

    await transporter.sendMail({
      from: `"${settings.fromName}" <${senderEmail}>`,
      to: params.employeeEmail,
      replyTo: senderEmail,
      subject,
      text: textBody,
      html: htmlBody,
      attachments,
      headers: {
        'X-Mailer': 'MPCG Payroll System',
        'X-Auto-Response-Suppress': 'OOF, AutoReply',
      },
    });

    return { success: true, message: `Salary slip emailed successfully to ${params.employeeEmail}` };
  } catch (error: any) {
    console.error(`Failed to send salary slip email to ${params.employeeEmail}:`, error);
    return { success: false, message: error.message || 'Failed to send salary slip email' };
  }
}
