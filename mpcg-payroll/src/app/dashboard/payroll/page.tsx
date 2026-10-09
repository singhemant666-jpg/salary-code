export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getPayrollData } from '@/actions/payroll';
import { formatINR, getMonthName } from '@/lib/currency-utils';
import PayrollActions from './PayrollActions';
import PayrollTable from './PayrollTable';

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = parseInt(params.month || String(now.getMonth() + 1));
  const year = parseInt(params.year || String(now.getFullYear()));
  const search = params.search || '';

  const { payrolls, stats } = await getPayrollData(month, year);
  const plainPayrolls = JSON.parse(JSON.stringify(payrolls));

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">{getMonthName(month)} {year} Payroll</h1>
          <p className="page-subtitle">
            {stats.totalEmployees} employees · {stats.processedEmployees} processed · {stats.pendingEmployees} pending
          </p>
        </div>
        <PayrollActions month={month} year={year} />
      </div>

      {/* Summary Cards */}
      <div className="grid-5 stagger" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Employees</div>
          <div className="stat-value">{stats.totalEmployees}</div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Gross Salary</div>
          <div className="stat-value" style={{ fontSize: '1.25rem' }}>{formatINR(stats.grossSalary)}</div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Deductions</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#ef4444' }}>{formatINR(stats.totalDeductions)}</div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Net Salary</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#06b6d4' }}>{formatINR(stats.netSalary)}</div>
        </div>
        <div className="stat-card animate-fade-in">
          <div className="stat-label">Total LOP</div>
          <div className="stat-value" style={{ fontSize: '1.25rem', color: '#f59e0b' }}>{formatINR(stats.totalLOP)}</div>
        </div>
      </div>

      {/* Employee Payroll Table with Real-time Search */}
      <PayrollTable
        payrolls={plainPayrolls}
        month={month}
        year={year}
        initialSearch={search}
      />
    </div>
  );
}
