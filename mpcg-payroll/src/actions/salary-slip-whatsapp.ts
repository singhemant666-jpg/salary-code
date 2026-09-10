'use server';

import { prisma } from '@/lib/prisma';
import { sendGupshupWhatsApp, getWhatsAppSettings } from '@/lib/whatsapp';

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || 'Month';
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

export interface WhatsAppSlipInfo {
  success: boolean;
  message?: string;
  employeeName?: string;
  mobile?: string;
  whatsappUrl?: string;
  messageText?: string;
}

/**
 * Generate WhatsApp message & click URL for an employee's salary slip
 */
export async function getSalarySlipWhatsAppInfo(payrollId: string, baseUrl?: string): Promise<WhatsAppSlipInfo> {
  try {
    const payroll = await prisma.monthlyPayroll.findUnique({
      where: { id: payrollId },
      include: {
        employee: true,
      },
    });

    if (!payroll) return { success: false, message: 'Payroll record not found' };

    const mobile = payroll.employee.mobile;
    if (!mobile) {
      return { success: false, message: `No mobile number found for ${payroll.employee.name}` };
    }

    const monthName = getMonthName(payroll.month);
    const paidDays = payroll.presentDays + payroll.paidLeaveDays + payroll.weeklyOffs + payroll.holidays;
    const netSalaryFormatted = formatINR(Number(payroll.netSalary));

    // Construct download link
    const domain = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const slipUrl = `${domain}/api/salary-slip/${payroll.id}`;

    const messageText = 
`📄 *SALARY SLIP - MY PAIN CLINIC GLOBAL*

Hello *${payroll.employee.name}*,
Your salary slip for *${monthName} ${payroll.year}* is ready!

💵 *Net Salary*: ${netSalaryFormatted}
📅 *Paid Days*: ${paidDays} days

View/Download your Salary Slip PDF:
${slipUrl}

Thank you!
*MPC Global HR Department*`;

    let cleanMobile = mobile.replace(/[^0-9]/g, '');
    if (cleanMobile.length === 10) {
      cleanMobile = '91' + cleanMobile;
    }

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://wa.me/${cleanMobile}?text=${encodedText}`;

    return {
      success: true,
      employeeName: payroll.employee.name,
      mobile: cleanMobile,
      whatsappUrl,
      messageText,
    };
  } catch (error) {
    console.error('Get WhatsApp slip info error:', error);
    return { success: false, message: 'Failed to generate WhatsApp link' };
  }
}

/**
 * Send salary slip via Gupshup WhatsApp API (if configured)
 */
export async function sendSalarySlipWhatsAppAPI(payrollId: string, baseUrl?: string) {
  const info = await getSalarySlipWhatsAppInfo(payrollId, baseUrl);
  if (!info.success || !info.mobile || !info.messageText) {
    return { success: false, message: info.message || 'Could not retrieve employee WhatsApp information' };
  }

  const settings = await getWhatsAppSettings();
  if (!settings.enabled || !settings.apiKey) {
    return {
      success: true,
      sentViaApi: false,
      whatsappUrl: info.whatsappUrl,
      message: `Direct WhatsApp API disabled. Opened WhatsApp Web link for ${info.employeeName}.`,
    };
  }

  const res = await sendGupshupWhatsApp(info.mobile, info.messageText);
  if (res.success) {
    return {
      success: true,
      sentViaApi: true,
      message: `Successfully sent Salary Slip via WhatsApp API to ${info.employeeName} (${info.mobile}).`,
    };
  } else {
    return {
      success: false,
      whatsappUrl: info.whatsappUrl,
      message: `API Failed: ${res.message}. You can use the direct WhatsApp link instead.`,
    };
  }
}
