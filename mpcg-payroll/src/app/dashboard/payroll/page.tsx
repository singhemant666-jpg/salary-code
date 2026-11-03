export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { cookies } from 'next/headers';
import { getPayrollData } from '@/actions/payroll';
import { getMonthName } from '@/lib/currency-utils';
import PayrollActions from './PayrollActions';
import PayrollTable from './PayrollTable';

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const cookieStore = await cookies();
  const savedMonth = cookieStore.get('mpcg_payroll_month')?.value;
  const savedYear = cookieStore.get('mpcg_payroll_year')?.value;

  const now = new Date();
  const month = parseInt(params.month || savedMonth || String(now.getMonth() + 1));
  const year = parseInt(params.year || savedYear || String(now.getFullYear()));
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

      {/* Employee Payroll Table with Dynamic Real-time Summary Cards & Filters */}
      <PayrollTable
        payrolls={plainPayrolls}
        month={month}
        year={year}
        initialSearch={search}
        monthStats={stats}
      />
    </div>
  );
}
