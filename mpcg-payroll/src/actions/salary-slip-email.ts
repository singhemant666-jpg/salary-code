'use server';

import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { SalarySlipDocument } from '@/lib/salary-slip-template';
import { getSalarySlipLayoutConfig } from '@/actions/salary-slip-config';
import { sendSalarySlipEmail, getSMTPSettings, SMTPSettings } from '@/lib/email';
import { revalidatePath } from 'next/cache';
import fs from 'fs/promises';
import path from 'path';

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || 'Month';
}

/**
 * Generate PDF buffer for a specific monthly payroll record
 */
async function generateSalarySlipBuffer(payrollId: string) {
  const payroll = await prisma.monthlyPayroll.findUnique({
    where: { id: payrollId },
    include: {
      employee: {
        include: {
          salaryStructures: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!payroll) throw new Error('Payroll record not found');

  const savedConfig = await getSalarySlipLayoutConfig();

  // Load header image if present
  let headerImageBase64: string | undefined;
  try {
    const headerPath = path.join(process.cwd(), 'public', 'header.png');
    const headerBuf = await fs.readFile(headerPath);
    headerImageBase64 = `data:image/png;base64,${headerBuf.toString('base64')}`;
  } catch (err) {
    console.warn('Header image not found:', err);
  }

  const monthName = getMonthName(payroll.month);
  const sanitizeName = payroll.employee.name.replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `MPC-${payroll.employee.employeeId}_${sanitizeName}_${monthName}_${payroll.year}.pdf`;

  const activeSalary = payroll.employee.salaryStructures[0];
  const initialSalaryVal = (activeSalary?.initialSalary && Number(activeSalary.initialSalary) > 0)
    ? Number(activeSalary.initialSalary)
    : undefined;

  const pdfBuffer = await renderToBuffer(
    SalarySlipDocument({
      employeeName: payroll.employee.name,
      employeeId: payroll.employee.employeeId,
      panNumber: payroll.employee.panNumber || '—',
      joiningDate: payroll.employee.joiningDate ? new Date(payroll.employee.joiningDate).toLocaleDateString('en-IN') : '—',
      initialSalary: initialSalaryVal,
      bankName: payroll.employee.bankName || '—',
      accountNumber: payroll.employee.accountNumber || '—',
      ifscCode: payroll.employee.ifscCode || '—',
      designation: payroll.employee.designation || '',
      department: payroll.employee.department || '',
      month: payroll.month,
      year: payroll.year,
      payDate: new Date().toLocaleDateString('en-IN'),
      paidDays: payroll.presentDays + payroll.paidLeaveDays + payroll.weeklyOffs + payroll.holidays,
      lopDays: Number(payroll.lopDays),
      leaveDays: payroll.paidLeaveDays,
      basicSalary: Number(payroll.basicSalary),
      hra: Number(payroll.hra),
      conveyance: Number(payroll.conveyance),
      otherAllowance: Number(payroll.otherAllowance),
      incentive: Number(payroll.incentiveAmount),
      overtime: Number(payroll.overtimeAmount),
      bonus: Number(payroll.bonusAmount),
      grossSalary: Number(payroll.grossSalary),
      lopDeduction: Number(payroll.lopDeduction),
      advanceDeduction: Number(payroll.advanceDeduction),
      loanDeduction: Number(payroll.loanDeduction),
      otherDeduction: Number(payroll.otherDeduction),
      pfDeduction: Number(payroll.pfDeduction),
      totalDeduction: Number(payroll.totalDeduction),
      netSalary: Number(payroll.netSalary),
      headerImageBase64,
      companyName: savedConfig.companyName,
      slipTitle: savedConfig.slipTitle,
      noteText: savedConfig.noteText,
      showHeaderLogo: savedConfig.showHeaderLogo,
      showSignatures: savedConfig.showSignatures,
      showHra: savedConfig.showHra,
      showConveyance: savedConfig.showConveyance,
      showIncentive: savedConfig.showIncentive,
      showOvertime: savedConfig.showOvertime,
      sig1Label: savedConfig.sig1Label,
      sig2Label: savedConfig.sig2Label,
      sig3Label: savedConfig.sig3Label,
      sig4Label: savedConfig.sig4Label,
      customEarnings: (savedConfig.customEarnings || [])
        .filter(e => e.enabled && Number(e.defaultValue || 0) > 0)
        .map(e => ({ name: e.name, amount: Number(e.defaultValue || 0) })),
      customDeductions: (savedConfig.customDeductions || [])
        .filter(d => d.enabled && Number(d.defaultValue || 0) > 0)
        .map(d => ({ name: d.name, amount: Number(d.defaultValue || 0) })),
    })
  );

  return {
    payroll,
    pdfBuffer,
    fileName,
    monthName,
  };
}

/**
 * Send Salary Slip email to a single employee by payroll ID
 */
export async function sendSingleSalarySlipEmail(payrollId: string) {
  try {
    const { payroll, pdfBuffer, fileName, monthName } = await generateSalarySlipBuffer(payrollId);

    if (!payroll.employee.email || payroll.employee.email.trim() === '') {
      return {
        success: false,
        message: `Employee "${payroll.employee.name}" does not have an email address configured.`,
      };
    }

    const res = await sendSalarySlipEmail({
      employeeName: payroll.employee.name,
      employeeEmail: payroll.employee.email,
      monthName,
      year: payroll.year,
      pdfBuffer: Buffer.from(pdfBuffer),
      fileName,
    });

    return res;
  } catch (error: any) {
    console.error('Send single salary slip error:', error);
    return { success: false, message: error.message || 'Failed to email salary slip' };
  }
}

/**
 * Bulk email salary slips to selected or all payroll IDs
 */
export async function sendBulkSalarySlipEmails(payrollIds: string[]) {
  if (!payrollIds || payrollIds.length === 0) {
    return { success: false, message: 'No salary slips selected for emailing.' };
  }

  let sentCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  for (const id of payrollIds) {
    try {
      const res = await sendSingleSalarySlipEmail(id);
      if (res.success) {
        sentCount++;
      } else {
        failCount++;
        errors.push(res.message);
      }
    } catch (err: any) {
      failCount++;
      errors.push(err.message || 'Unknown error');
    }
  }

  revalidatePath('/dashboard/salary-slips');
  return {
    success: sentCount > 0,
    sentCount,
    failCount,
    skippedCount,
    message: `Batch email completed: ${sentCount} sent successfully, ${failCount} failed.`,
    errors,
  };
}

/**
 * SMTP Configuration actions
 */
export async function fetchSMTPSettings(): Promise<SMTPSettings> {
  return getSMTPSettings();
}

export async function saveSMTPSettings(config: SMTPSettings) {
  try {
    await prisma.payrollSetting.upsert({
      where: { key: 'smtp_email_config' },
      update: {
        value: JSON.stringify(config),
        category: 'email',
      },
      create: {
        key: 'smtp_email_config',
        value: JSON.stringify(config),
        category: 'email',
        description: 'SMTP Server Settings for Automated Email Notifications',
      },
    });

    revalidatePath('/dashboard/settings/email');
    return { success: true, message: 'SMTP email settings saved successfully!' };
  } catch (error: any) {
    console.error('Failed to save SMTP settings:', error);
    return { success: false, message: error.message || 'Failed to save SMTP settings' };
  }
}

export async function testSMTPConnection(targetEmail: string) {
  if (!targetEmail) return { success: false, message: 'Please enter a recipient email for testing' };

  try {
    const { createEmailTransporter, getSMTPSettings } = await import('@/lib/email');
    const settings = await getSMTPSettings();
    const transporter = await createEmailTransporter();

    await transporter.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail || settings.user}>`,
      to: targetEmail,
      subject: 'Test Email — MPCG Payroll System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #123B6D;">MY PAIN CLINIC GLOBAL</h2>
          <p style="color: #22c55e; font-weight: bold;">✅ SMTP Connection Successful!</p>
          <p>This is a test email sent from your MPCG Payroll Management System.</p>
        </div>
      `,
    });

    return { success: true, message: `Test email sent successfully to ${targetEmail}!` };
  } catch (error: any) {
    console.error('SMTP test error:', error);
    return { success: false, message: error.message || 'Failed to connect to SMTP server' };
  }
}
