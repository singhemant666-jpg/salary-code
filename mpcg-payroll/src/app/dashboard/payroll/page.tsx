import { getPayrollData } from '@/actions/payroll';
import { formatINR, getMonthName } from '@/lib/currency-utils';
import type { PaidLeaveBalanceInfo } from '@/actions/payroll';
import Link from 'next/link';
import PayrollActions from './PayrollActions';
import EditDeductionsModal from './EditDeductionsModal';
import RecalculateButton from './RecalculateButton';

// Compute leave balance from already-fetched payrolls (no extra DB query per employee)
function computeLeaveBalance(
  payrolls: any[],
  currentPayrollId: string,
  currentEmployeeId: string,
  year: number,
  month: number
): PaidLeaveBalanceInfo {
  const ANNUAL_LEAVES = 6;
  const periodStart = Math.floor((month - 1) / 2) * 2 + 1;
  const periodEnd = periodStart + 1;
  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const periodLabel = `${monthNames[periodStart]}-${monthNames[periodEnd]}`;
  const empPayrolls = payrolls.filter((p: any) =>
    p.employeeId === currentEmployeeId && p.id !== currentPayrollId
  );
  const usedThisYear = empPayrolls.reduce((s: number, p: any) => s + Number(p.paidLeaveAdjustment || 0), 0);
  const usedInPeriod = empPayrolls
    .filter((p: any) => p.month === periodStart || p.month === periodEnd)
    .reduce((s: number, p: any) => s + Number(p.paidLeaveAdjustment || 0), 0);
  const remainingAnnual = ANNUAL_LEAVES - usedThisYear;
  const periodAllowance = usedInPeriod >= 1 ? 0 : 1;
  const maxForThisMonth = Math.min(periodAllowance, Math.max(0, remainingAnnual));
  return { annualTotal: ANNUAL_LEAVES, usedThisYear, remainingAnnual, usedInPeriod, maxForThisMonth, periodLabel };
}

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const now = new Date();
  const month = parseInt(params.month || String(now.getMonth() + 1));
  const year = parseInt(params.year || String(now.getFullYear()));

  const { payrolls, stats } = await getPayrollData(month, year);

  const statusBadgeMap: Record<string, string> = {
    DRAFT: 'badge-draft',
    CALCULATED: 'badge-calculated',
    UNDER_REVIEW: 'badge-review',
    APPROVED: 'badge-approved',
    FINALIZED: 'badge-finalized',
    SALARY_SLIP_GENERATED: 'badge-generated',
  };

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

      {/* Employee Payroll Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>ID</th>
              <th className="text-right">Present</th>
              <th className="text-right">Leave</th>
              <th className="text-right">LOP</th>
              <th className="text-right">Gross</th>
              <th className="text-right">Deduction</th>
              <th className="text-right">Net</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No payroll records for this month. Click &quot;Create Payroll Period&quot; to start.
                </td>
              </tr>
            ) : (
              payrolls.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500 }}>{p.employee.name}</td>
                  <td className="font-mono text-sm text-muted">{p.employee.employeeId}</td>
                  <td className="text-right">{p.presentDays}</td>
                  <td className="text-right">{p.paidLeaveDays}</td>
                  <td className="text-right" style={{ color: Number(p.lopDays) > 0 ? '#f59e0b' : undefined }}>
                    {Number(p.lopDays)}
                  </td>
                  <td className="text-right font-mono" style={{ verticalAlign: 'top', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 600 }}>{formatINR(Number(p.basicSalary))}</div>
                    {Number(p.overtimeAmount) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#0891b2', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        + {formatINR(Number(p.overtimeAmount))} OT
                      </div>
                    )}
                    {Number(p.incentiveAmount) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#16a34a', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        + {formatINR(Number(p.incentiveAmount))} Inc
                      </div>
                    )}
                    {Number(p.bonusAmount) > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#2563eb', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        + {formatINR(Number(p.bonusAmount))} Bonus
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: 'var(--text-secondary)', 
                      borderTop: '1px dashed rgba(255,255,255,0.1)', 
                      marginTop: '4px', 
                      paddingTop: '4px',
                      whiteSpace: 'nowrap',
                      fontWeight: 500
                    }}>
                      Gross: {formatINR(Number(p.grossSalary))}
                    </div>
                  </td>
                  <td className="text-right font-mono" style={{ color: '#ef4444' }}>
                    {formatINR(Number(p.totalDeduction))}
                  </td>
                  <td className="text-right font-mono" style={{ fontWeight: 600 }}>
                    {formatINR(Number(p.netSalary))}
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeMap[p.status] || 'badge-draft'}`}>
                      {p.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <div className="flex-gap">
                      <EditDeductionsModal
                        payroll={{
                          id: p.id,
                          employeeName: p.employee.name,
                          employeeId: p.employee.employeeId,
                          grossSalary: Number(p.grossSalary),
                          lopDeduction: Number(p.lopDeduction),
                          lopDays: Number(p.lopDays),
                          shortHoursDeduction: Number((p as any).shortHoursDeduction || 0),
                          advanceDeduction: Number(p.advanceDeduction),
                          otherDeduction: Number(p.otherDeduction),
                          otherDeductionNote: p.otherDeductionNote,
                          pfDeduction: Number(p.pfDeduction),
                          totalDeduction: Number(p.totalDeduction),
                          netSalary: Number(p.netSalary),
                          basicSalary: Number(p.basicSalary),
                          paidLeaveAdjustment: Number((p as any).paidLeaveAdjustment || 0),
                          holdSalaryDeduction: Number((p as any).holdSalaryDeduction || 0),
                        }}
                        leaveBalance={computeLeaveBalance(payrolls, p.id, p.employeeId, year, month)}
                      />
                      <RecalculateButton
                        payrollId={p.id}
                        isFinal={p.status === 'FINALIZED' || p.status === 'SALARY_SLIP_GENERATED'}
                      />
                      <Link
                        href={`/dashboard/payroll/${p.id}`}
                        className="btn btn-ghost btn-sm"
                        style={{ textDecoration: 'none' }}
                      >
                        View
                      </Link>
                      {p.salarySlip && (
                        <Link
                          href={`/api/salary-slip/${p.id}`}
                          className="btn btn-ghost btn-sm text-accent"
                          style={{ textDecoration: 'none' }}
                          target="_blank"
                        >
                          PDF
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
