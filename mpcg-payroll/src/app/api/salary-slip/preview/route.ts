import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { SalarySlipDocument } from '@/lib/salary-slip-template';
import { getSalarySlipLayoutConfig } from '@/actions/salary-slip-config';
import { auth } from '@/lib/auth';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const bodyConfig = await request.json().catch(() => ({}));
    const savedConfig = await getSalarySlipLayoutConfig();

    // Merge saved config with body payload if provided
    const config = { ...savedConfig, ...bodyConfig };

    // Load header image if needed
    let headerImageBase64: string | undefined;
    if (config.showHeaderLogo) {
      try {
        const headerPath = path.join(process.cwd(), 'public', 'header.png');
        const headerBuf = await fs.readFile(headerPath);
        headerImageBase64 = `data:image/png;base64,${headerBuf.toString('base64')}`;
      } catch (e) {
        console.warn('Header image not found at public/header.png');
      }
    }

    // Enabled custom line items
    const enabledCustomEarnings = (config.customEarnings || [])
      .filter((e: any) => e.enabled && (Number(e.defaultValue) || 0) > 0)
      .map((e: any) => ({ name: e.name, amount: Number(e.defaultValue) || 0 }));

    const enabledCustomDeductions = (config.customDeductions || [])
      .filter((d: any) => d.enabled && (Number(d.defaultValue) || 0) > 0)
      .map((d: any) => ({ name: d.name, amount: Number(d.defaultValue) || 0 }));

    const customEarningsSum = enabledCustomEarnings.reduce((sum: number, e: any) => sum + e.amount, 0);
    const customDeductionsSum = enabledCustomDeductions.reduce((sum: number, d: any) => sum + d.amount, 0);

    const basicSalary = 35000;
    const incentive = config.showIncentive ? 2500 : 0;
    const overtime = config.showOvertime ? 1200 : 0;
    const bonus = 0;
    const grossSalary = basicSalary + incentive + overtime + customEarningsSum;

    const pfDeduction = config.showPf ? 1800 : 0;
    const advanceDeduction = config.showAdvance ? 1000 : 0;
    const loanDeduction = config.showLoan ? 500 : 0;
    const totalDeductions = pfDeduction + advanceDeduction + loanDeduction + customDeductionsSum;

    const netSalary = grossSalary - totalDeductions;

    const pdfBuffer = await renderToBuffer(
      SalarySlipDocument({
        employeeName: 'Rahul Sharma',
        employeeId: 'MPC-080',
        panNumber: 'ABCDE1234F',
        joiningDate: '15/01/2024',
        initialSalary: 38700,
        bankName: 'HDFC Bank',
        accountNumber: '46457547567354',
        ifscCode: 'HDFC0001234',
        designation: 'Senior Physiotherapist',
        department: 'Clinical',
        month: 8,
        year: 2026,
        payDate: '31/08/2026',
        paidDays: 31,
        lopDays: 0,
        leaveDays: 0,
        basicSalary,
        hra: 0,
        conveyance: 0,
        otherAllowance: 0,
        incentive,
        overtime,
        bonus,
        grossSalary,
        lopDeduction: 0,
        pfDeduction,
        advanceDeduction,
        loanDeduction,
        otherDeduction: 0,
        totalDeduction: totalDeductions,
        netSalary,
        showHeaderLogo: config.showHeaderLogo,
        headerImageBase64,
        showSignatures: config.showSignatures,
        companyName: config.companyName || 'MY PAIN CLINIC GLOBAL',
        slipTitle: config.slipTitle || 'SALARY SLIP',
        noteText: config.noteText,
        showHra: config.showHra ?? true,
        showConveyance: config.showConveyance ?? true,
        showIncentive: config.showIncentive,
        showOvertime: config.showOvertime,
        sig1Label: config.sig1Label || 'Employee Signature',
        sig2Label: config.sig2Label || 'Checked By',
        sig3Label: config.sig3Label || 'Approved By',
        sig4Label: config.sig4Label || 'Authorized Signatory',
        customEarnings: enabledCustomEarnings,
        customDeductions: enabledCustomDeductions,
      })
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Sample_Salary_Slip_Template.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Failed to generate preview PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
