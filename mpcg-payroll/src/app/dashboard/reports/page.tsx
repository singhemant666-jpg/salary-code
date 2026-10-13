export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { getPayrollData } from '@/actions/payroll';
import { formatINR, getMonthName } from '@/lib/currency-utils';
import { BarChart3, Users, DollarSign, ArrowDownRight, Wallet, AlertTriangle } from 'lucide-react';
import ReportsControls from './ReportsControls';
import ReportsRegisterTable from './ReportsRegisterTable';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const now = new Date();

  // Find all available payroll periods for quick selection
  const availablePeriodsRaw = await prisma.monthlyPayroll.groupBy({
    by: ['year', 'month'],
    where: { employee: { status: 'ACTIVE' } },
    _count: { id: true },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  const availablePeriods = availablePeriodsRaw.map((p) => ({
    year: p.year,
    month: p.month,
    count: p._count.id,
  }));

  // Determine selected month and year (fallback to latest period with data)
  let month = params.month ? parseInt(params.month, 10) : 0;
  let year = params.year ? parseInt(params.year, 10) : 0;

  if (!month || !year || month < 1 || month > 12) {
    if (availablePeriods.length > 0) {
      month = availablePeriods[0].month;
      year = availablePeriods[0].year;
    } else {
      month = now.getMonth() + 1;
      year = now.getFullYear();
    }
  }

  // Fetch full payroll data for the selected month/year
  const { payrolls, stats } = await getPayrollData(month, year);
  const plainPayrolls = JSON.parse(JSON.stringify(payrolls));
  const monthName = getMonthName(month);

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h1 className="page-title">Payroll Reports</h1>
          <p className="page-subtitle">
            {monthName} {year} · Comprehensive Salary Register &amp; Detailed Employee Breakdown
          </p>
        </div>
      </div>

      {/* Month Selection Bar & Excel Export Trigger */}
      <ReportsControls
        currentMonth={month}
        currentYear={year}
        availablePeriods={availablePeriods}
      />

      {/* Summary KPI Cards */}
      <div className="grid-5 stagger" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Processed Employees</div>
          <div className="stat-value">{stats.totalEmployees}</div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Gross Salary</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#38bdf8' }}>
            {formatINR(stats.grossSalary)}
          </div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Total Deductions</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#ef4444' }}>
            {formatINR(stats.totalDeductions)}
          </div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Net Salary Disbursed</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#34d399', fontWeight: 800 }}>
            {formatINR(stats.netSalary)}
          </div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Total LOP Deductions</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#f59e0b' }}>
            {formatINR(stats.totalLOP)}
          </div>
        </div>
      </div>

      {/* Detailed Salary Register Table with Search & Filtering */}
      <ReportsRegisterTable
        payrolls={plainPayrolls}
        monthName={monthName}
        year={year}
        month={month}
      />
    </div>
  );
}
