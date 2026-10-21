'use server';

import { prisma } from '@/lib/prisma';
import {
  sendGupshupWhatsApp,
  sendGupshupTemplate,
  sendGupshupWhatsAppDocument,
  getWhatsAppSettings,
} from '@/lib/whatsapp';
import { generateSalarySlipToken } from '@/lib/salary-slip-token';

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
  slipUrl?: string;
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

    // Construct secure authenticated download link
    const token = generateSalarySlipToken(payroll.id);
    const domain = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const slipUrl = `${domain}/api/salary-slip/${payroll.id}?token=${token}`;

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
      slipUrl,
    };
  } catch (error) {
    console.error('Get WhatsApp slip info error:', error);
    return { success: false, message: 'Failed to generate WhatsApp link' };
  }
}

/**
 * Send salary slip via Gupshup WhatsApp API.
 * Supports:
 * 1. Direct PDF Media Template (attaches the .pdf document directly in chat)
 * 2. Text Template with secure download link
 * 3. Graceful fallback to raw WhatsApp API or WhatsApp Web
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

  const payroll = await prisma.monthlyPayroll.findUnique({
    where: { id: payrollId },
    include: { employee: true },
  });

  const monthName = payroll ? getMonthName(payroll.month) : 'Month';
  const yearStr = payroll ? String(payroll.year) : '';
  const netFormatted = payroll ? formatINR(Number(payroll.netSalary)) : '';
  const paidDaysStr = payroll ? String(Number(payroll.presentDays)) : '';
  const token = generateSalarySlipToken(payrollId);
  const domain = baseUrl || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const slipUrl = `${domain}/api/salary-slip/${payrollId}?token=${token}`;

  const safeEmpName = (info.employeeName || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Salary_Slip_${safeEmpName}_${monthName}_${yearStr}.pdf`;

  const isMediaPdfMode = settings.salarySlipMode === 'MEDIA_DOCUMENT' || Boolean(settings.templateIdSalarySlipMedia);
  const mediaTemplateId = settings.templateIdSalarySlipMedia || settings.templateIdSalarySlip;

  // 1. Direct PDF Document Attachment via Gupshup Media Template
  if (settings.useTemplate && isMediaPdfMode && mediaTemplateId) {
    const mediaParams = [
      info.employeeName || 'Employee',
      `${monthName} ${yearStr}`,
      netFormatted,
      paidDaysStr,
    ];

    const mediaRes = await sendGupshupTemplate(
      info.mobile,
      mediaTemplateId,
      mediaParams,
      {
        type: 'document',
        url: slipUrl,
        filename,
      }
    );

    if (mediaRes.success) {
      return {
        success: true,
        sentViaApi: true,
        whatsappUrl: info.whatsappUrl,
        message: `Successfully sent Salary Slip PDF document directly via WhatsApp to ${info.employeeName} (${info.mobile})! 📎📄`,
      };
    }
    console.warn('Gupshup Media Document template delivery failed, trying text template fallback:', mediaRes.message);
  }

  // 2. Text Template with Download Link
  if (settings.useTemplate && settings.templateIdSalarySlip) {
    const textTemplateParams = [
      info.employeeName || 'Employee',
      `${monthName} ${yearStr}`,
      netFormatted,
      paidDaysStr,
      slipUrl,
    ];

    const tmplRes = await sendGupshupTemplate(info.mobile, settings.templateIdSalarySlip, textTemplateParams);
    if (tmplRes.success) {
      return {
        success: true,
        sentViaApi: true,
        whatsappUrl: info.whatsappUrl,
        message: `Successfully sent Salary Slip via WhatsApp Template API to ${info.employeeName} (${info.mobile}).`,
      };
    } else {
      console.warn('Gupshup Text Template delivery failed:', tmplRes.message);
    }
  }

  // 3. Raw Document API (if media mode is active and domain is reachable)
  if (isMediaPdfMode) {
    const directDocRes = await sendGupshupWhatsAppDocument(
      info.mobile,
      slipUrl,
      filename,
      `Salary Slip for ${monthName} ${yearStr}`
    );
    if (directDocRes.success) {
      return {
        success: true,
        sentViaApi: true,
        whatsappUrl: info.whatsappUrl,
        message: `Successfully delivered Salary Slip PDF directly to ${info.employeeName} (${info.mobile})! 📎`,
      };
    }
  }

  // 4. Raw Text API fallback
  const res = await sendGupshupWhatsApp(info.mobile, info.messageText);
  if (res.success) {
    return {
      success: true,
      sentViaApi: true,
      whatsappUrl: info.whatsappUrl,
      message: `Successfully sent Salary Slip notification via WhatsApp API to ${info.employeeName} (${info.mobile}).`,
    };
  }

  return {
    success: false,
    sentViaApi: false,
    whatsappUrl: info.whatsappUrl,
    message: `WhatsApp API requires an approved Meta Template for automated delivery. Click below to open in WhatsApp Web / Desktop directly.`,
  };
}
