'use server';

import { prisma } from '@/lib/prisma';
import { sendGupshupWhatsApp, sendGupshupTemplate, getWhatsAppSettings } from '@/lib/whatsapp';

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
    const paidDays = Number(payroll.presentDays);
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
      message: `WhatsApp API is disabled in settings. Click below to open in WhatsApp Web / App directly.`,
    };
  }

  // If a Gupshup Template ID is configured for Salary Slip
  if (settings.useTemplate && settings.templateIdSalarySlip) {
    const payroll = await prisma.monthlyPayroll.findUnique({ where: { id: payrollId } });
    const monthName = payroll ? getMonthName(payroll.month) : 'Month';
    const yearStr = payroll ? String(payroll.year) : '';
    const netFormatted = payroll ? formatINR(Number(payroll.netSalary)) : '';
    const paidDaysStr = payroll ? String(Number(payroll.presentDays)) : '';
    const domain = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const slipUrl = `${domain}/api/salary-slip/${payrollId}`;

    const templateParams = [
      info.employeeName || 'Employee',
      `${monthName} ${yearStr}`,
      netFormatted,
      paidDaysStr,
      slipUrl,
    ];

    const tmplRes = await sendGupshupTemplate(info.mobile, settings.templateIdSalarySlip, templateParams);
    if (tmplRes.success) {
      return {
        success: true,
        sentViaApi: true,
        whatsappUrl: info.whatsappUrl,
        message: `Successfully sent Salary Slip via WhatsApp Template API to ${info.employeeName} (${info.mobile}).`,
      };
    } else {
      return {
        success: false,
        sentViaApi: false,
        whatsappUrl: info.whatsappUrl,
        message: `WhatsApp Template Error: ${tmplRes.message}. You can send directly via WhatsApp Web below.`,
      };
    }
  }

  // If no template is configured, try raw text API or provide clear fallback
  const res = await sendGupshupWhatsApp(info.mobile, info.messageText);
  if (res.success) {
    return {
      success: true,
      sentViaApi: true,
      whatsappUrl: info.whatsappUrl,
      message: `Successfully sent Salary Slip via WhatsApp API to ${info.employeeName} (${info.mobile}).`,
    };
  } else {
    return {
      success: false,
      sentViaApi: false,
      whatsappUrl: info.whatsappUrl,
      message: `WhatsApp API requires an approved Meta Template for automated delivery. Click below to open in WhatsApp Web / Desktop directly.`,
    };
  }
}
