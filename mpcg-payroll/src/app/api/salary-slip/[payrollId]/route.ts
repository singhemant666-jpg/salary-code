import { isS3Configured, uploadSalarySlipToS3 } from '@/lib/s3';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { renderToBuffer } from '@react-pdf/renderer';
import { SalarySlipDocument } from '@/lib/salary-slip-template';
import { getSalarySlipLayoutConfig } from '@/actions/salary-slip-config';
import { getCustomDeductionAmount, isProfessionalTax } from '@/lib/pt-calculator';
import { getMonthName, formatDateDDMMYYYY } from '@/lib/currency-utils';
import { isDefaultTdsDesignation, isDoctorProfession } from '@/lib/salary-calculator';
import { auth } from '@/lib/auth';
import { getSalaryStructureForPayrollPeriod } from '@/actions/payroll';
import { createAuditLog, formatUserIdentity } from '@/lib/audit-logger';
import path from 'path';
import fs from 'fs/promises';

import { verifySalarySlipToken } from '@/lib/salary-slip-token';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ payrollId: string }> }
) {
  let payrollId = '';
  try {
    const resolvedParams = await params;
    payrollId = resolvedParams.payrollId;
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');
    const isValidToken = verifySalarySlipToken(payrollId, token);

    let session = null;
    try {
      session = await auth();
    } catch (authErr) {
      console.warn('Auth check warning in salary slip API:', authErr);
    }

    if (!session?.user && !isValidToken) {
      return NextResponse.json({ error: 'Unauthorized. Please login or provide a valid access token.' }, { status: 401 });
    }

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
      return NextResponse.json({ error: `Payroll record not found for ID: ${payrollId}` }, { status: 404 });
    }

    // Load header image safely
    let headerImageBase64: string | undefined;
    try {
      const headerPath = path.join(process.cwd(), 'public', 'header.png');
      const headerBuf = await fs.readFile(headerPath);
      headerImageBase64 = `data:image/png;base64,${headerBuf.toString('base64')}`;
    } catch (e) {
      console.warn('Header image not found at public/header.png');
    }

    const savedConfig = await getSalarySlipLayoutConfig();

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

    let initialSalaryVal: number | undefined;
    try {
      const activeSalary = await getSalaryStructureForPayrollPeriod(payroll.employeeId, payroll.month, payroll.year);
      initialSalaryVal = (activeSalary?.initialSalary && Number(activeSalary.initialSalary) > 0)
        ? Number(activeSalary.initialSalary)
        : undefined;

      if (!initialSalaryVal) {
        const anyWithInitial = await prisma.employeeSalaryStructure.findFirst({
          where: { employeeId: payroll.employeeId, initialSalary: { not: null, gt: 0 } },
          orderBy: { effectiveDate: 'desc' },
          select: { initialSalary: true },
        });
        if (anyWithInitial?.initialSalary && Number(anyWithInitial.initialSalary) > 0) {
          initialSalaryVal = Number(anyWithInitial.initialSalary);
        }
      }
    } catch (err) {
      console.warn('Could not fetch initial salary:', err);
    }

    let tdsDeductionVal = Number((payroll as any).tdsDeduction || 0);

    if (
      tdsDeductionVal === 0 &&
      !(payroll as any).isTdsCustomized &&
      (Boolean((payroll.employee as any).tdsEnabled) || isDefaultTdsDesignation(payroll.employee.designation))
    ) {
      const deductionsBeforeTds =
        Number(payroll.lopDeduction) +
        Number((payroll as any).shortHoursDeduction || 0) +
        Number((payroll as any).holdSalaryDeduction || 0) +
        Number(payroll.advanceDeduction) +
        Number(payroll.loanDeduction) +
        Number(payroll.otherDeduction) +
        Number(payroll.pfDeduction) +
        Number((payroll as any).ptDeduction || 0);
      const netBeforeTds = Math.max(0, Number(payroll.grossSalary) - deductionsBeforeTds);
      if ((payroll.employee as any).tdsMode === 'FIXED') {
        tdsDeductionVal = Math.max(0, Math.round(Number((payroll.employee as any).tdsAmount || 0)));
      } else {
        const pct = Number((payroll.employee as any).tdsPercentage ?? 10);
        tdsDeductionVal = Math.round(netBeforeTds * (pct / 100));
      }
    }

    // On the salary slip, Total Deduction and Net Salary are displayed without TDS deduction.
    // TDS is displayed separately below Net Salary Payable.
    const rawTotal = Number(payroll.totalDeduction);
    const savedTds = Number((payroll as any).tdsDeduction || 0);
    const totalDeductionVal = Math.max(0, Math.round((rawTotal - savedTds) * 100) / 100);
    const netSalaryVal = Math.max(0, Math.round(Number(payroll.grossSalary) - totalDeductionVal));

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      SalarySlipDocument({
        employeeName: payroll.employee.name,
        employeeId: payroll.employee.employeeId,
        panNumber: payroll.employee.panNumber || '—',
        joiningDate: formatDateDDMMYYYY(payroll.employee.joiningDate),
        exitDate: (payroll.employee as any).exitDate ? formatDateDDMMYYYY((payroll.employee as any).exitDate) : undefined,
        initialSalary: initialSalaryVal,
        bankName: payroll.employee.bankName || '—',
        accountNumber: payroll.employee.accountNumber || '—',
        ifscCode: payroll.employee.ifscCode || '—',
        designation: payroll.employee.designation || '',
        department: payroll.employee.department || '',
        month: payroll.month,
        year: payroll.year,
        payDate: formatDateDDMMYYYY(new Date()),
        paidDays: Number(payroll.presentDays),
        lopDays: Number(payroll.lopDays),
        leaveDays: Number(payroll.paidLeaveDays),
        basicSalary: Number(payroll.basicSalary),
        hra: Number(payroll.hra),
        conveyance: Number(payroll.conveyance),
        otherAllowance: Number(payroll.otherAllowance),
        incentive: Number(payroll.incentiveAmount),
        overtime: Number(payroll.overtimeAmount),
        bonus: Number(payroll.bonusAmount),
        grossSalary: Number(payroll.grossSalary),
        lopDeduction: Number(payroll.lopDeduction),
        latePenaltyDeduction: Number((payroll as any).latePenaltyDeduction || 0),
        suddenLeavePenaltyDeduction: Number((payroll as any).suddenLeavePenaltyDeduction || 0),
        suddenLeavePenaltyDays: Number((payroll as any).suddenLeavePenaltyDays || 0),
        shortHoursDeduction: Number((payroll as any).shortHoursDeduction || 0),
        shortWorkingHours: Number((payroll as any).shortWorkingHours || 0),
        holdSalaryDeduction: Number((payroll as any).holdSalaryDeduction || 0),
        holdSalaryReleaseAmount: Number((payroll as any).holdSalaryReleaseAmount || 0),
        advanceDeduction: Number(payroll.advanceDeduction),
        loanDeduction: Number(payroll.loanDeduction),
        otherDeduction: Number(payroll.otherDeduction),
        pfDeduction: Number(payroll.pfDeduction),
        tdsDeduction: tdsDeductionVal,
        totalDeduction: totalDeductionVal,
        netSalary: netSalaryVal,
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
          .map(d => {
            let amount = 0;
            if (isProfessionalTax(d.name)) {
              const isDoctor = isDoctorProfession(payroll.employee.designation);
              const isPtWaived = Boolean((payroll as any).waivePtDeduction);
              const isPtApplicable = (payroll.employee as any).ptApplicable !== false;
              if (!isPtApplicable || isPtWaived || (isDoctor && tdsDeductionVal > 0)) {
                amount = 0;
              } else if ((payroll as any).ptDeduction !== undefined && (payroll as any).ptDeduction !== null) {
                amount = Number((payroll as any).ptDeduction);
              } else {
                amount = getCustomDeductionAmount(
                  d,
                  payroll.employee.gender,
                  Number(payroll.basicSalary) + Number(payroll.hra) + Number(payroll.conveyance) + Number(payroll.otherAllowance),
                  payroll.month,
                  {
                    designation: payroll.employee.designation,
                    isTdsDeducted: tdsDeductionVal > 0,
                    isPtWaived,
                    ptApplicable: isPtApplicable,
                  }
                );
              }
            } else {
              amount = getCustomDeductionAmount(
                d,
                payroll.employee.gender,
                Number(payroll.basicSalary) + Number(payroll.hra) + Number(payroll.conveyance) + Number(payroll.otherAllowance),
                payroll.month
              );
            }
            return { name: d.name, amount };
          })
          .filter(d => d.amount > 0),
      })
    );

    const monthName = getMonthName(payroll.month);
    const safeName = (payroll.employee.name || 'Employee')
      .replace(/[/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
    const rawEmpId = (payroll.employee.employeeId || '').trim();
    const cleanEmpId = rawEmpId.startsWith('MPC-') ? rawEmpId : `MPC-${rawEmpId}`;
    const fileName = `${cleanEmpId}_${safeName}_${monthName}_${payroll.year}.pdf`;

    // Persist file in background (S3 primary, local disk fallback)
    try {
      const storagePath = path.join(process.cwd(), 'salary-slips', String(payroll.year), monthName);
      const filePath = path.join(storagePath, fileName);
      let savedLocation = filePath;

      // 1. If AWS S3 is configured, upload to S3
      const s3Key = `salary-slips/${payroll.year}/${monthName}/${fileName}`;
      if (isS3Configured()) {
        try {
          const s3Res = await uploadSalarySlipToS3(s3Key, Buffer.from(pdfBuffer));
          if (s3Res.success && s3Res.s3Url) {
            savedLocation = s3Res.s3Url;
          }
        } catch (s3Err) {
          console.warn('[S3] Upload warning:', s3Err);
        }
      }

      // 2. Also save to local disk if directory is writable
      try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, pdfBuffer);
      } catch (diskErr) {
        // Disk write failed (e.g. read-only filesystem), ignore if S3 succeeded
      }

      const operatorName = session?.user?.name || 'Automated / WhatsApp';
      await prisma.salarySlip.upsert({
        where: { payrollId: payroll.id },
        update: {
          filePath: savedLocation,
          fileName,
          generatedAt: new Date(),
          generatedBy: operatorName,
        },
        create: {
          payrollId: payroll.id,
          employeeId: payroll.employeeId,
          month: payroll.month,
          year: payroll.year,
          filePath: savedLocation,
          fileName,
          generatedBy: operatorName,
        },
      });

      if (payroll.status === 'FINALIZED') {
        await prisma.monthlyPayroll.update({
          where: { id: payroll.id },
          data: { status: 'SALARY_SLIP_GENERATED' },
        });
      }

      if (session?.user) {
        await createAuditLog({
          userId: session.user.id,
          userName: formatUserIdentity(session.user),
          action: 'GENERATE',
          entity: 'SalarySlip',
          entityId: payroll.id,
          newValue: {
            fileName,
            month: payroll.month,
            year: payroll.year,
            employee: payroll.employee.name,
            employeeId: payroll.employee.employeeId,
            department: payroll.employee.department,
            netSalary: Number(payroll.netSalary),
            grossSalary: Number(payroll.grossSalary),
            totalDeduction: Number(payroll.totalDeduction),
          },
          reason: `Generated official salary slip PDF for ${payroll.employee.name} (${payroll.employee.employeeId}) for ${payroll.month}/${payroll.year} · Net Pay: ₹${Number(payroll.netSalary).toLocaleString('en-IN')}`,
        });
      }
    } catch (saveErr) {
      console.warn('Background salary slip caching warning:', saveErr);
    }

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error('Salary slip API error for payrollId:', payrollId, error);
    return NextResponse.json(
      {
        error: 'Failed to generate salary slip PDF',
        details: error?.message || String(error),
        payrollId,
      },
      { status: 500 }
    );
  }
}
