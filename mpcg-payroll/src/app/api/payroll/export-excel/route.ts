import { NextRequest, NextResponse } from 'next/server';
import { getPayrollData } from '@/actions/payroll';
import { generatePayrollExcelReport } from '@/lib/payroll-excel';
import { getMonthName } from '@/lib/currency-utils';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();

    let month = parseInt(searchParams.get('month') || '0', 10);
    let year = parseInt(searchParams.get('year') || '0', 10);

    // If month/year not provided or invalid, find latest available payroll period
    if (!month || !year || month < 1 || month > 12) {
      const latestPeriod = await prisma.monthlyPayroll.findFirst({
        where: { employee: { status: 'ACTIVE' } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        select: { month: true, year: true },
      });

      if (latestPeriod) {
        month = latestPeriod.month;
        year = latestPeriod.year;
      } else {
        month = now.getMonth() + 1;
        year = now.getFullYear();
      }
    }

    const { payrolls, stats } = await getPayrollData(month, year);
    const monthName = getMonthName(month);

    const excelBuffer = generatePayrollExcelReport({
      month,
      year,
      payrolls,
      stats,
      companyName: 'MY PAIN CLINIC GLOBAL',
    });

    const fileName = `MPCG_Payroll_Report_${monthName}_${year}.xlsx`;

    return new NextResponse(excelBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating Excel payroll report:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel report', details: error.message },
      { status: 500 }
    );
  }
}
