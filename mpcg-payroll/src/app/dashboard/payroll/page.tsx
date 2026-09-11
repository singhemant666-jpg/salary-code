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
  const currentP = payrolls.find((p: any) => p.id === currentPayrollId) || {};
  const joiningDateRaw = currentP.employee?.joiningDate;
  const joiningDate = joiningDateRaw ? new Date(joiningDateRaw) : null;
  const basicSalary = Number(currentP.basicSalary || 0);

  const empPayrolls = payrolls.filter((p: any) =>
    p.employeeId === currentEmployeeId && p.id !== currentPayrollId
  );

  let tenureMonths = 12; // default if joiningDate missing
  let usedInFirst6Months = 0;

  if (joiningDate) {
    const jYear = joiningDate.getUTCFullYear();
    const jMonth = joiningDate.getUTCMonth() + 1;

    tenureMonths = (year - jYear) * 12 + (month - jMonth);
    if (tenureMonths < 0) tenureMonths = 0;

    const startMonthAbs = jYear * 12 + jMonth;
    const first6EndAbs = startMonthAbs + 5;

    usedInFirst6Months = empPayrolls
      .filter((p: any) => {
        const pAbs = (p.year || year) * 12 + p.month;
        return pAbs >= startMonthAbs && pAbs <= first6EndAbs;
      })
      .reduce((s: number, p: any) => s + Number(p.paidLeaveAdjustment || 0), 0);
  }

  let blockNumber = 0;
  let annualTotal = 0;
  let periodLabel = 'Months 1–6 (Probation)';
  let maxForThisMonth = 0;
  let usedThisYear = 0;

  if (tenureMonths < 6) {
    blockNumber = 0;
    annualTotal = 0;
    periodLabel = 'Months 1–6 (Probation)';
    usedThisYear = usedInFirst6Months;
    maxForThisMonth = 0;
  } else if (tenureMonths >= 6 && tenureMonths < 12) {
    blockNumber = 1;
    annualTotal = 3;
    periodLabel = 'Months 7–12 (Block 1)';

    const jYear = joiningDate ? joiningDate.getUTCFullYear() : year;
    const jMonth = joiningDate ? joiningDate.getUTCMonth() + 1 : 1;
    const block1StartAbs = jYear * 12 + jMonth + 6;
    const block1EndAbs = jYear * 12 + jMonth + 11;

    const usedInBlock1 = empPayrolls
      .filter((p: any) => {
        const pAbs = (p.year || year) * 12 + p.month;
        return pAbs >= block1StartAbs && pAbs <= block1EndAbs;
      })
      .reduce((s: number, p: any) => s + Number(p.paidLeaveAdjustment || 0), 0);

    usedThisYear = usedInBlock1;
    maxForThisMonth = Math.max(0, 3 - usedInBlock1);
  } else {
    blockNumber = 2;
    annualTotal = 6;
    periodLabel = 'Year 1+ Completed';

    const empYearIndex = Math.floor(tenureMonths / 12);
    const jYear = joiningDate ? joiningDate.getUTCFullYear() : year;
    const jMonth = joiningDate ? joiningDate.getUTCMonth() + 1 : 1;

    const currentEmpYearStartAbs = jYear * 12 + jMonth + empYearIndex * 12;
    const currentEmpYearEndAbs = currentEmpYearStartAbs + 11;

    const usedInEmpYear = empPayrolls
      .filter((p: any) => {
        const pAbs = (p.year || year) * 12 + p.month;
        return pAbs >= currentEmpYearStartAbs && pAbs <= currentEmpYearEndAbs;
      })
      .reduce((s: number, p: any) => s + Number(p.paidLeaveAdjustment || 0), 0);

    usedThisYear = usedInEmpYear;
    maxForThisMonth = Math.max(0, 6 - usedInEmpYear);
  }

  const unlocked6MonthBonus = tenureMonths >= 6;
  const is1YearCompleted = tenureMonths >= 12;
  const remainingAnnual = Math.max(0, annualTotal - usedThisYear);

  const perDaySalary = basicSalary > 0 ? (basicSalary / 30) : 0;
  const encashmentAmount = is1YearCompleted && remainingAnnual > 0
    ? Math.round(remainingAnnual * perDaySalary * 100) / 100
    : 0;

  return {
    annualTotal,
    usedThisYear,
    remainingAnnual,
    usedInPeriod: usedThisYear,
    usedInFirst6Months,
    tenureMonths,
    blockNumber,
    unlocked6MonthBonus,
    is1YearCompleted,
    encashmentAmount,
    maxForThisMonth,
    periodLabel,
  };
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
              <th className="text-right">Late Penalty</th>
              <th className="text-right">Short Hours</th>
              <th className="text-right">Gross</th>
              <th className="text-right">P. Tax</th>
              <th className="text-right">Deduction</th>
              <th className="text-right">Net</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No payroll records for this month. Click &quot;Create Payroll Period&quot; to start.
                </td>
              </tr>
            ) : (
              payrolls.map((p: any) => {
                const latePenaltyDays = Number((p as any).latePenaltyDays || 0);
                const latePenaltyDeduction = Number((p as any).latePenaltyDeduction || 0);
                const ptDeduction = Number((p as any).ptDeduction || 200);

                const totalLopDays = Number(p.lopDays || 0);
                const baseLopDays = Math.max(0, totalLopDays - latePenaltyDays);
                const totalLopDeduction = Number(p.lopDeduction || 0);
                const baseLopDeduction = Math.max(0, Math.round((totalLopDeduction - latePenaltyDeduction) * 100) / 100);

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.employee.name}</td>
                    <td className="font-mono text-sm text-muted">{p.employee.employeeId}</td>
                    <td className="text-right">{p.presentDays}</td>
                    <td className="text-right">{p.paidLeaveDays}</td>
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {baseLopDeduction > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                            {formatINR(baseLopDeduction)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {baseLopDays}d LOP
                          </div>
                        </>
                      ) : baseLopDays > 0 ? (
                        <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                          {baseLopDays}d LOP
                        </div>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>

                    {/* NEW: Late Penalty Column */}
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {latePenaltyDeduction > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#ef4444' }}>
                            {formatINR(latePenaltyDeduction)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>
                            {latePenaltyDays}d late
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {(p as any).waiveShortHoursDeduction ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>
                            Waived
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {(Number((p as any).shortWorkingHours || 0)).toFixed(2)}h short
                          </div>
                        </>
                      ) : Number((p as any).shortHoursDeduction || 0) > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#ef4444' }}>
                            {formatINR(Number((p as any).shortHoursDeduction))}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>
                            {(Number((p as any).shortWorkingHours || 0)).toFixed(2)}h short
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
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

                    {/* NEW: P. Tax Column */}
                    <td className="text-right font-mono" style={{ color: '#f43f5e', fontWeight: 500 }}>
                      {formatINR(ptDeduction)}
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
                          shortWorkingHours: Number((p as any).shortWorkingHours || 0),
                          waiveShortHoursDeduction: Boolean((p as any).waiveShortHoursDeduction),
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
                      {p.status !== 'DRAFT' && (
                        <Link
                          href={`/api/salary-slip/${p.id}`}
                          className="btn btn-ghost btn-sm text-accent"
                          style={{ textDecoration: 'none', fontWeight: 600 }}
                          target="_blank"
                        >
                          PDF
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
