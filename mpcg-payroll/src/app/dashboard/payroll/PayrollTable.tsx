'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X, User, Calendar, Plus } from 'lucide-react';
import { formatINR, decimalHoursToHHMMString, decimalHoursToReadableString, getMonthName } from '@/lib/currency-utils';
import { isDoctorProfession } from '@/lib/salary-calculator';
import { createPayrollPeriod, type PaidLeaveBalanceInfo } from '@/actions/payroll';
import RecalculateButton from './RecalculateButton';
import EditDeductionsModal from './EditDeductionsModal';

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
  const openingPaidLeavesUsed = Math.min(6, Math.max(0, Number(currentP.employee?.openingPaidLeavesUsed || 0)));

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

  const annualTotal = 6;
  const unlocked6MonthBonus = tenureMonths >= 6;
  const is1YearCompleted = tenureMonths >= 12;

  const empYearIndex = Math.floor(tenureMonths / 12);
  const jYear = joiningDate ? joiningDate.getUTCFullYear() : year;
  const jMonth = joiningDate ? joiningDate.getUTCMonth() + 1 : 1;

  const currentEmpYearStartAbs = jYear * 12 + jMonth + empYearIndex * 12;
  const currentEmpYearEndAbs = currentEmpYearStartAbs + 11;

  const payrollUsedThisYear = empPayrolls
    .filter((p: any) => {
      const pAbs = (p.year || year) * 12 + p.month;
      return pAbs >= currentEmpYearStartAbs && pAbs <= currentEmpYearEndAbs;
    })
    .reduce((s: number, p: any) => s + Number(p.paidLeaveAdjustment || 0), 0);

  const usedThisYear = payrollUsedThisYear + openingPaidLeavesUsed;
  const remainingAnnual = Math.max(0, annualTotal - usedThisYear);

  let blockNumber = 0;
  let periodLabel = 'Months 1–6 (Probation)';
  let maxForThisMonth = 0;

  if (tenureMonths < 6) {
    blockNumber = 0;
    periodLabel = 'Months 1–6 (Probation)';
    maxForThisMonth = 0;
  } else if (tenureMonths >= 6 && tenureMonths < 12) {
    blockNumber = 1;
    periodLabel = 'Months 7–12';
    maxForThisMonth = remainingAnnual;
  } else {
    blockNumber = 2;
    periodLabel = 'Year 1+ Completed';
    maxForThisMonth = remainingAnnual;
  }

  const perDaySalary = basicSalary > 0 ? (basicSalary / 30) : 0;
  const encashmentAmount = is1YearCompleted && remainingAnnual > 0
    ? Math.round(remainingAnnual * perDaySalary * 100) / 100
    : 0;

  return {
    annualTotal,
    usedThisYear,
    payrollUsedThisYear,
    openingPaidLeavesUsed,
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

const statusBadgeMap: Record<string, string> = {
  DRAFT: 'badge-draft',
  CALCULATED: 'badge-calculated',
  UNDER_REVIEW: 'badge-review',
  APPROVED: 'badge-approved',
  FINALIZED: 'badge-finalized',
  SALARY_SLIP_GENERATED: 'badge-generated',
};

interface PayrollTableProps {
  payrolls: any[];
  month: number;
  year: number;
  initialSearch?: string;
}

export default function PayrollTable({
  payrolls,
  month,
  year,
  initialSearch = '',
}: PayrollTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [creatingPeriod, setCreatingPeriod] = useState(false);

  const handleCreatePeriod = async () => {
    setCreatingPeriod(true);
    try {
      const res = await createPayrollPeriod(month, year);
      if (res?.message) alert(res.message);
      router.refresh();
    } catch (e: any) {
      alert(e.message || 'Error creating period');
    } finally {
      setCreatingPeriod(false);
    }
  };

  // Live filter payrolls by employee name, employee ID, or biometric ID
  const filteredPayrolls = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payrolls;

    return payrolls.filter((p: any) => {
      const name = (p.employee?.name || '').toLowerCase();
      const empId = (p.employee?.employeeId || '').toLowerCase();
      const bioId = (p.employee?.biometricId || '').toLowerCase();
      const dept = (p.employee?.department || '').toLowerCase();
      return name.includes(q) || empId.includes(q) || bioId.includes(q) || dept.includes(q);
    });
  }, [payrolls, search]);

  useEffect(() => {
    try {
      const currentUrl = `/dashboard/payroll?month=${month}&year=${year}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`;
      sessionStorage.setItem('mpcg_last_payroll_url', currentUrl);
    } catch {
      // ignore
    }
  }, [month, year, search]);

  const payrollReturnUrl = `/dashboard/payroll?month=${month}&year=${year}${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ''}`;

  return (
    <div>
      {/* Search Bar & Result Counter */}
      <div
        className="filter-bar"
        style={{
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div
          className="search-bar"
          style={{
            flex: 1,
            maxWidth: '440px',
            position: 'relative',
          }}
        >
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Search by employee name or ID (e.g. Hardi, MPC-139)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearch('');
            }}
            style={{
              paddingRight: search ? '2.5rem' : '1rem',
              width: '100%',
              fontSize: '0.875rem',
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '4px',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div
          style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {search.trim() ? (
            <span>
              Showing <strong style={{ color: '#06b6d4' }}>{filteredPayrolls.length}</strong> of{' '}
              {payrolls.length} employees
            </span>
          ) : (
            <span>
              Total <strong style={{ color: 'var(--text-primary)' }}>{payrolls.length}</strong> employees
            </span>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ minWidth: '130px' }}>Employee</th>
              <th style={{ minWidth: '70px' }}>ID</th>
              <th className="text-right" style={{ minWidth: '55px' }}>Present</th>
              <th className="text-right" style={{ minWidth: '50px' }}>Leave</th>
              <th className="text-right" style={{ minWidth: '65px' }}>LOP</th>
              <th className="text-right" style={{ minWidth: '95px' }}>Missing Punch</th>
              <th className="text-right" style={{ minWidth: '85px' }}>Late Coming</th>
              <th className="text-right" style={{ minWidth: '85px' }}>Sudden Leave</th>
              <th className="text-right" style={{ minWidth: '85px' }}>Short Hours</th>
              <th className="text-right" style={{ minWidth: '55px' }}>OT</th>
              <th className="text-right" style={{ minWidth: '75px' }}>Gross</th>
              <th className="text-right" style={{ minWidth: '60px' }}>P. Tax</th>
              <th className="text-right" style={{ minWidth: '60px' }}>TDS</th>
              <th className="text-right" style={{ minWidth: '75px' }}>Deduction</th>
              <th className="text-right th-net-salary" style={{ minWidth: '95px', whiteSpace: 'nowrap' }}>Net Salary</th>
              <th className="text-right th-transfer-amt" style={{ minWidth: '105px', whiteSpace: 'nowrap' }}>Transferred Amt</th>
              <th style={{ minWidth: '75px' }}>Status</th>
              <th style={{ minWidth: '70px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payrolls.length === 0 ? (
              <tr>
                <td colSpan={18} style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(6, 182, 212, 0.1)',
                      color: 'var(--accent-primary, #06b6d4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.25rem'
                    }}>
                      <Calendar size={28} />
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      No Payroll Records for {getMonthName(month)} {year}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Attendance and payroll records have not been initialized for this month yet. Click below to create the payroll period for all active employees.
                    </div>
                    <button
                      type="button"
                      onClick={handleCreatePeriod}
                      disabled={creatingPeriod}
                      className="btn btn-primary"
                      style={{ marginTop: '0.75rem', gap: '0.5rem' }}
                    >
                      <Plus size={16} />
                      {creatingPeriod ? 'Creating Period...' : 'Create Payroll Period'}
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredPayrolls.length === 0 ? (
              <tr>
                <td colSpan={18} className="text-center" style={{ padding: '3rem' }}>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                    No employees found matching &quot;<strong style={{ color: '#06b6d4' }}>{search}</strong>&quot;
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="btn btn-secondary btn-sm"
                  >
                    Clear Search
                  </button>
                </td>
              </tr>
            ) : (
              filteredPayrolls.map((p: any) => {
                const latePenaltyDays = Number((p as any).latePenaltyDays || 0);
                const latePenaltyDeduction = Number((p as any).latePenaltyDeduction || 0);
                const suddenPenaltyDays = Number((p as any).suddenLeavePenaltyDays || 0);
                const suddenPenaltyDeduction = Number((p as any).suddenLeavePenaltyDeduction || 0);
                const isPtWaived = Boolean((p as any).waivePtDeduction);
                const isDoctor = isDoctorProfession(p.employee?.designation);
                const hasTds = Number((p as any).tdsDeduction || 0) > 0;
                const isDoctorTdsExempt = isDoctor && hasTds;
                const ptDeduction = (isPtWaived || isDoctorTdsExempt)
                  ? 0
                  : ((p as any).ptDeduction !== undefined && (p as any).ptDeduction !== null
                      ? Number((p as any).ptDeduction)
                      : 0);

                const perDaySalary = Number(p.basicSalary || p.grossSalary || 0) / 30;
                const missingPunchDays = Number((p as any).missingPunchDays || 0);
                const missingPunchDeductionDays = Math.round(missingPunchDays * 0.5 * 10) / 10;
                const missingPunchDeduction = Math.round(missingPunchDeductionDays * perDaySalary * 100) / 100;

                const totalLopDays = Number(p.lopDays || 0);
                const totalLopDeduction = Number(p.lopDeduction || 0);
                const baseLopDeduction = Math.max(
                  0,
                  Math.round((totalLopDeduction - latePenaltyDeduction - suddenPenaltyDeduction - missingPunchDeduction) * 100) / 100
                );

                const chargedPenaltyDays =
                  perDaySalary > 0 && suddenPenaltyDeduction > 0
                    ? Math.round(suddenPenaltyDeduction / perDaySalary)
                    : suddenPenaltyDays;
                const rawSuddenDays =
                  chargedPenaltyDays >= 2 ? Math.round(chargedPenaltyDays / 2) : suddenPenaltyDays;
                const baseLopDays = Math.max(
                  0,
                  Math.round((totalLopDays - latePenaltyDays - rawSuddenDays - missingPunchDeductionDays) * 10) / 10
                );

                return (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.employee.name}</td>
                    <td className="font-mono text-sm text-muted">{p.employee.employeeId}</td>
                    <td className="text-right">{Number(p.presentDays)}</td>
                    <td className="text-right">{Number(p.paidLeaveDays)}</td>
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {Boolean((p as any).waiveLopDeduction) ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>
                            Waived
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹0 ({baseLopDays}d LOP waived)
                          </div>
                        </>
                      ) : baseLopDeduction > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                            {formatINR(baseLopDeduction)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {baseLopDays}d LOP{suddenPenaltyDeduction > 0 ? ' (grace)' : ''}
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

                    {/* Missing Punch Column */}
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {(p.employee as any)?.missingPunchPenalty === false ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#06b6d4', fontSize: '0.85rem' }}>
                            Exempt (OFF)
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹0 {missingPunchDays > 0 ? `(${missingPunchDays} missing)` : ''}
                          </div>
                        </>
                      ) : Boolean((p as any).waiveMissingPunchDeduction) ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>
                            Waived
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹0 {missingPunchDays > 0 ? `(${missingPunchDays} missing)` : ''}
                          </div>
                        </>
                      ) : missingPunchDeduction > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#f59e0b' }}>
                            {formatINR(missingPunchDeduction)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {missingPunchDays} missing ({missingPunchDeductionDays}d ded)
                          </div>
                        </>
                      ) : missingPunchDays > 0 ? (
                        <>
                          <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                            {missingPunchDays} missing
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {missingPunchDeductionDays}d ded
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Late Coming Column */}
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {Boolean((p as any).waiveLatePenaltyDeduction) ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>
                            Waived
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹0 {Number((p as any).lateCount) > 0 ? `(${(p as any).lateCount} late)` : ''}
                          </div>
                        </>
                      ) : latePenaltyDeduction > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#ef4444' }}>
                            {formatINR(latePenaltyDeduction)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>
                            {latePenaltyDays}d penalty
                            {Number((p as any).lateCount) > 0 ? ` (${(p as any).lateCount} late)` : ''}
                          </div>
                        </>
                      ) : Number((p as any).lateCount) > 0 ? (
                        <>
                          <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600 }}>
                            {(p as any).lateCount} late
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {(p as any).employee?.strictLateRule ? '(within grace)' : '₹0 (grace)'}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Sudden Leave Penalty Column */}
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {Boolean((p as any).waiveSuddenLeaveDeduction) ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>
                            Waived
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹0 (2x waived)
                          </div>
                        </>
                      ) : suddenPenaltyDeduction > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#ef4444' }}>
                            {formatINR(suddenPenaltyDeduction)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>
                            {rawSuddenDays}d sudden (2x = {chargedPenaltyDays}d)
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
                            {decimalHoursToHHMMString((p as any).shortWorkingHours)} (
                            {decimalHoursToReadableString((p as any).shortWorkingHours)}) short
                          </div>
                        </>
                      ) : Number((p as any).shortHoursDeduction || 0) > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#ef4444' }}>
                            {formatINR(Number((p as any).shortHoursDeduction))}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '2px' }}>
                            {decimalHoursToHHMMString((p as any).shortWorkingHours)} (
                            {decimalHoursToReadableString((p as any).shortWorkingHours)}) short
                          </div>
                        </>
                      ) : Number((p as any).shortWorkingHours || 0) > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '0.85rem' }}>
                            {decimalHoursToHHMMString((p as any).shortWorkingHours)}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ({decimalHoursToReadableString((p as any).shortWorkingHours)}) short
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* OT (Overtime) Column */}
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {Number(p.overtimeAmount) > 0 ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#06b6d4' }}>
                            + {formatINR(Number(p.overtimeAmount))}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {decimalHoursToHHMMString(p.overtimeHours)} (
                            {decimalHoursToReadableString(p.overtimeHours)}) OT
                          </div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    <td
                      className="text-right font-mono"
                      style={{ verticalAlign: 'top', paddingTop: '0.75rem', paddingBottom: '0.75rem' }}
                    >
                      <div style={{ fontWeight: 600 }}>{formatINR(Number(p.basicSalary))}</div>
                      {Number(p.incentiveAmount) > 0 && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#16a34a',
                            whiteSpace: 'nowrap',
                            marginTop: '2px',
                          }}
                        >
                          + {formatINR(Number(p.incentiveAmount))} Inc
                        </div>
                      )}
                      {Number(p.bonusAmount) > 0 && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: '#2563eb',
                            whiteSpace: 'nowrap',
                            marginTop: '2px',
                          }}
                        >
                          + {formatINR(Number(p.bonusAmount))} Bonus
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-secondary)',
                          borderTop: '1px dashed rgba(255,255,255,0.1)',
                          marginTop: '4px',
                          paddingTop: '4px',
                          whiteSpace: 'nowrap',
                          fontWeight: 500,
                        }}
                      >
                        Gross: {formatINR(Number(p.grossSalary))}
                      </div>
                    </td>

                    {/* P. Tax Column */}
                    <td className="text-right font-mono" style={{ verticalAlign: 'top' }}>
                      {isPtWaived ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#16a34a', fontSize: '0.85rem' }}>
                            Waived
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹0 (PT waived)
                          </div>
                        </>
                      ) : isDoctorTdsExempt ? (
                        <>
                          <div style={{ fontWeight: 600, color: '#06b6d4', fontSize: '0.85rem' }}>
                            Exempt
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            ₹0 (Doctor TDS)
                          </div>
                        </>
                      ) : ptDeduction > 0 ? (
                        <span style={{ color: '#f43f5e', fontWeight: 500 }}>
                          {formatINR(ptDeduction)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* TDS Column */}
                    <td
                      className="text-right font-mono"
                      style={{
                        color: Number((p as any).tdsDeduction || 0) > 0 ? '#3b82f6' : 'var(--text-secondary)',
                        fontWeight: 500,
                      }}
                    >
                      {Number((p as any).tdsDeduction || 0) > 0
                        ? formatINR(Number((p as any).tdsDeduction))
                        : '—'}
                    </td>

                    <td className="text-right font-mono" style={{ color: '#ef4444' }}>
                      {formatINR(Number(p.totalDeduction))}
                    </td>

                    {/* Net (Pre-TDS) = netSalary + tdsDeduction */}
                    <td className="text-right font-mono">
                      <div style={{ fontWeight: 600 }} className="th-net-salary">
                        {formatINR(Number(p.netSalary) + Number((p as any).tdsDeduction || 0))}
                      </div>
                    </td>

                    {/* Transferred Amount = final netSalary after TDS */}
                    <td className="text-right font-mono th-transfer-amt" style={{ fontWeight: 700 }}>
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
                            designation: p.employee.designation,
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
                            tdsDeduction: Number((p as any).tdsDeduction || 0),
                            ptDeduction: Number((p as any).ptDeduction || 0),
                            totalDeduction: Number(p.totalDeduction),
                            netSalary: Number(p.netSalary),
                            basicSalary: Number(p.basicSalary),
                            paidLeaveAdjustment: Number((p as any).paidLeaveAdjustment || 0),
                            holdSalaryDeduction: Number((p as any).holdSalaryDeduction || 0),
                            holdSalaryReleaseAmount: Number((p as any).holdSalaryReleaseAmount || 0),
                            holdSalaryReleaseReason: (p as any).holdSalaryReleaseReason || null,
                            latePenaltyDeduction: Number((p as any).latePenaltyDeduction || 0),
                            latePenaltyDays: Number((p as any).latePenaltyDays || 0),
                            lateCount: Number((p as any).lateCount || 0),
                            waiveLatePenaltyDeduction: Boolean((p as any).waiveLatePenaltyDeduction),
                            suddenLeavePenaltyDeduction: Number((p as any).suddenLeavePenaltyDeduction || 0),
                            suddenLeavePenaltyDays: Number((p as any).suddenLeavePenaltyDays || 0),
                            waiveSuddenLeaveDeduction: Boolean((p as any).waiveSuddenLeaveDeduction),
                            waiveLopDeduction: Boolean((p as any).waiveLopDeduction),
                            waivePtDeduction: Boolean((p as any).waivePtDeduction),
                            missingPunchDays: Number((p as any).missingPunchDays || 0),
                            waiveMissingPunchDeduction: Boolean((p as any).waiveMissingPunchDeduction),
                          }}
                          leaveBalance={(p as any).leaveBalance || computeLeaveBalance(payrolls, p.id, p.employeeId, year, month)}
                        />
                        <RecalculateButton
                          payrollId={p.id}
                          isFinal={p.status === 'FINALIZED' || p.status === 'SALARY_SLIP_GENERATED'}
                        />
                        <Link
                          href={`/dashboard/payroll/${p.id}?returnUrl=${encodeURIComponent(payrollReturnUrl)}`}
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
