import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { SalarySlipDocument } from '@/lib/salary-slip-template';
import { getSalarySlipLayoutConfig } from '@/actions/salary-slip-config';
import { getCustomDeductionAmount } from '@/lib/pt-calculator';
import { getMonthName } from '@/lib/currency-utils';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit-logger';
import path from 'path';
import fs from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { payrollId } = await params;

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

  if (!payroll) {
    return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
  }

  try {
    // Load header image
    let headerImageBase64: string | undefined;
    try {
      const headerPath = path.join(process.cwd(), 'public', 'header.png');
      const headerBuf = await fs.readFile(headerPath);
      headerImageBase64 = `data:image/png;base64,${headerBuf.toString('base64')}`;
    } catch (e) {
      console.warn('Header image not found at public/header.png');
    }

    const savedConfig = await getSalarySlipLayoutConfig();
    const searchParams = request.nextUrl.searchParams;

    const showHeaderLogo = searchParams.has('showHeaderLogo')
      ? searchParams.get('showHeaderLogo') === 'true'
      : savedConfig.showHeaderLogo;

    const showSignatures = searchParams.has('showSignatures')
      ? searchParams.get('showSignatures') === 'true'
      : savedConfig.showSignatures;

    const showHra = searchParams.has('showHra')
      ? searchParams.get('showHra') !== 'false'
      : (savedConfig.showHra ?? true);

    const showConveyance = searchParams.has('showConveyance')
      ? searchParams.get('showConveyance') !== 'false'
      : (savedConfig.showConveyance ?? true);

    const showIncentive = searchParams.has('showIncentive')
      ? searchParams.get('showIncentive') === 'true'
      : savedConfig.showIncentive;

    const showOvertime = searchParams.has('showOvertime')
      ? searchParams.get('showOvertime') === 'true'
      : savedConfig.showOvertime;

    const activeSalary = payroll.employee.salaryStructures[0];
    const initialSalaryVal = (activeSalary?.initialSalary && Number(activeSalary.initialSalary) > 0)
      ? Number(activeSalary.initialSalary)
      : undefined;

    // Generate PDF
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
        paidDays: Number(payroll.presentDays),
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
        shortHoursDeduction: Number((payroll as any).shortHoursDeduction || 0),
        shortWorkingHours: Number((payroll as any).shortWorkingHours || 0),
        holdSalaryDeduction: Number((payroll as any).holdSalaryDeduction || 0),
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
        showHeaderLogo,
        showSignatures,
        showHra,
        showConveyance,
        showIncentive,
        showOvertime,
        sig1Label: savedConfig.sig1Label,
        sig2Label: savedConfig.sig2Label,
        sig3Label: savedConfig.sig3Label,
        sig4Label: savedConfig.sig4Label,
        customEarnings: (savedConfig.customEarnings || [])
          .filter(e => e.enabled && Number(e.defaultValue || 0) > 0)
          .map(e => ({ name: e.name, amount: Number(e.defaultValue || 0) })),
        customDeductions: (savedConfig.customDeductions || [])
          .map(d => ({
            name: d.name,
            amount: getCustomDeductionAmount(d, payroll.employee.gender, Number(payroll.grossSalary), payroll.month),
          }))
          .filter(d => d.amount > 0),
      })
    );

    // File naming as per PRD: EMP001_Rahul_Sharma_August_2026.pdf
    const monthName = getMonthName(payroll.month);
    const safeName = payroll.employee.name
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    const fileName = `${payroll.employee.employeeId}_${safeName}_${monthName}_${payroll.year}.pdf`;

    // Store the PDF
    const storagePath = path.join(process.cwd(), 'salary-slips', String(payroll.year), monthName);
    const filePath = path.join(storagePath, fileName);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, pdfBuffer);

    // Save/update salary slip record
    await prisma.salarySlip.upsert({
      where: { payrollId: payroll.id },
      update: {
        filePath,
        fileName,
        generatedAt: new Date(),
        generatedBy: session.user.name,
      },
      create: {
        payrollId: payroll.id,
        employeeId: payroll.employeeId,
        month: payroll.month,
        year: payroll.year,
        filePath,
        fileName,
        generatedBy: session.user.name,
      },
    });

    // Update payroll status if needed
    if (payroll.status === 'FINALIZED') {
      await prisma.monthlyPayroll.update({
        where: { id: payroll.id },
        data: { status: 'SALARY_SLIP_GENERATED' },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      userName: session.user.name,
      action: 'GENERATE',
      entity: 'SalarySlip',
      entityId: payroll.id,
      newValue: { fileName, month: payroll.month, year: payroll.year },
    });

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate salary slip PDF' },
      { status: 500 }
    );
  }
}
