import { getEmployeeById, isEmployeeSandwichRuleEnabled, isEmployeeMissingPunchPenaltyEnabled } from '@/actions/employees';
import { getPaidLeaveBalance } from '@/actions/payroll';
import { formatINR, getMonthName, formatDateDDMMYYYY } from '@/lib/currency-utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Edit, User, Building, CreditCard, Clock, CalendarCheck } from 'lucide-react';
import EmployeeActions from './EmployeeActions';
import ReleaseSalaryHoldModal from './ReleaseSalaryHoldModal';
import EmployeeBackButton from '../EmployeeBackButton';

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | undefined>>;
}) {
  const { id } = await params;
  const sParams = searchParams ? await searchParams : {};
  const returnUrl = sParams.returnUrl;
  const employee = await getEmployeeById(id);

  if (!employee) notFound();

  const isSandwichRule = await isEmployeeSandwichRuleEnabled(id);
  const isMissingPunchPenalty = await isEmployeeMissingPunchPenaltyEnabled(id);

  const activeSalary = employee.salaryStructures.find((s: any) => s.isActive);
  const monthlyTotal = activeSalary
    ? Number(activeSalary.basicSalary)
    : 0;

  const now = new Date();
  const leaveBalance = await getPaidLeaveBalance(employee.id, now.getFullYear(), now.getMonth() + 1, '');

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <EmployeeBackButton returnUrl={returnUrl} />
          <div>
            <h1 className="page-title">{employee.name}</h1>
            <p className="page-subtitle">
              {employee.employeeId} · {employee.designation || 'No designation'} · Biometric: {employee.biometricId}
            </p>
          </div>
        </div>
        <EmployeeActions employeeId={employee.id} status={employee.status} overtimeEligible={Boolean(activeSalary?.overtimeEligible)} returnUrl={returnUrl} />
      </div>

      {/* Status & Summary Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">Status</div>
          <div style={{ marginTop: '0.5rem' }}>
            <span className={`badge ${employee.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
              {employee.status}
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Salary</div>
          <div className="stat-value" style={{ fontSize: '1.375rem' }}>{formatINR(monthlyTotal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Employment Type</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
            {employee.employmentType?.replace('_', ' ') || 'Full Time'}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Department</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
            {employee.department || '—'}
          </div>
        </div>
      </div>

      {/* 15-Day Joining Salary Hold Policy & Status */}
      <ReleaseSalaryHoldModal
        employeeId={employee.id}
        employeeName={employee.name}
        heldSalaryBalance={Number((employee as any).heldSalaryBalance || 0)}
        holdSalaryStatus={(employee as any).holdSalaryStatus || 'NONE'}
        holdSalaryReleasedAt={(employee as any).holdSalaryReleasedAt}
        holdSalaryReleaseNotes={(employee as any).holdSalaryReleaseNotes}
        holdSalaryOnJoining={Boolean((employee as any).holdSalaryOnJoining)}
      />

      <div className="grid-2" style={{ gap: '1.5rem', marginTop: '1.5rem' }}>
        {/* Personal Info */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: '#06b6d4' }} /> Personal Information
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="Employee ID" value={employee.employeeId} />
            <InfoRow label="Name" value={employee.name} />
            <InfoRow label="Date of Birth" value={formatDateDDMMYYYY(employee.dateOfBirth)} />
            <InfoRow label="Gender" value={employee.gender || '—'} />
            <InfoRow label="Mobile" value={employee.mobile || '—'} />
            <InfoRow label="Email" value={employee.email || '—'} />
            <InfoRow label="PAN Number" value={employee.panNumber || '—'} />
            <InfoRow label="Address" value={employee.address || '—'} />
          </div>
        </div>

        {/* Employment Info */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building size={18} style={{ color: '#22c55e' }} /> Employment Information
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="Designation" value={employee.designation || '—'} />
            <InfoRow label="Department" value={employee.department || '—'} />
            <InfoRow label="Branch" value={employee.branch || '—'} />
            <InfoRow label="Joining Date" value={formatDateDDMMYYYY(employee.joiningDate)} />
            <InfoRow
              label="Exit / Relieving Date"
              value={(employee as any).exitDate ? formatDateDDMMYYYY((employee as any).exitDate) : 'Active (No exit date)'}
              color={(employee as any).exitDate ? '#f87171' : undefined}
            />
            <InfoRow label="Employment Type" value={employee.employmentType?.replace('_', ' ') || '—'} />
            <InfoRow label="Reporting Manager" value={employee.reportingManager || '—'} />
            <InfoRow label="Biometric ID" value={employee.biometricId} />
            <InfoRow label="Standard Hours" value={`${Number(employee.standardWorkingHours || 9)} Hours / day`} />
            <InfoRow label="Shift Timing" value={`${(employee as any).shiftStartTime || '09:00'} - ${(employee as any).shiftEndTime || '18:00'}`} />
            <InfoRow label="Late Threshold" value={`${(employee as any).lateThresholdMinutes ?? 10} mins`} />
            <InfoRow label="Half Day Threshold" value={`${Number((employee as any).halfDayThreshold ?? 5)} Hours`} />
            <InfoRow label="Overtime After" value={`${Number((employee as any).overtimeAfterHours ?? employee.standardWorkingHours ?? 9)} Hours`} />
            <InfoRow label="Strict Late Penalty" value={(employee as any).strictLateRule === true ? 'Active (5 Grace @ 10m; 6th+ Late = 0.5 Day LOP)' : 'Disabled (Off)'} />
            <InfoRow label="Sandwich Rule" value={isSandwichRule ? 'Active (Weekly-offs between leaves converted to LOP)' : 'Disabled (Off)'} />
            <InfoRow label="Missing Punch Rule" value={isMissingPunchPenalty ? 'Active (0.5 Day Deduction per missing punch)' : 'Disabled (Off - Exempt)'} />
            <InfoRow label="Sudden Leave Penalty" value={(employee as any).suddenLeavePenalty !== false ? 'Active (Sudden / Unapproved = 2x Deduction)' : 'Disabled (Off)'} />
            <InfoRow label="Hold Salary on Joining" value={(employee as any).holdSalaryOnJoining ? 'Active (15-Day Basic Salary Held Once)' : 'Disabled (Off)'} />
          </div>
        </div>

        {/* Salary Structure */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={18} style={{ color: '#f59e0b' }} /> Salary Structure
          </h3>
          {activeSalary ? (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <InfoRow label="Basic Salary" value={formatINR(Number(activeSalary.basicSalary))} />
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.75rem' }}>
                <InfoRow label="Total Monthly" value={formatINR(monthlyTotal)} highlight />
              </div>
              <InfoRow label="Incentive Eligible" value={activeSalary.incentiveEligible ? 'Yes' : 'No'} />
              <InfoRow 
                label="Overtime Eligible" 
                value={activeSalary.overtimeEligible ? 'Yes (Enabled)' : 'No (Disabled)'} 
                color={activeSalary.overtimeEligible ? '#06b6d4' : '#ef4444'} 
              />
              <InfoRow
                label="TDS Deduction"
                value={
                  (employee as any).tdsEnabled
                    ? (employee as any).tdsMode === 'FIXED'
                      ? `Active (Fixed ${formatINR(Number((employee as any).tdsAmount || 0))})`
                      : `Active (${Number((employee as any).tdsPercentage ?? 10)}% of Net)`
                    : 'Disabled (Off)'
                }
                color={(employee as any).tdsEnabled ? '#2563eb' : undefined}
              />
              <InfoRow label="Effective From" value={formatDateDDMMYYYY(activeSalary.effectiveDate)} />
            </div>
          ) : (
            <p className="text-muted">No active salary structure</p>
          )}
        </div>

        {/* Bank Info */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔒 Bank Information
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="Bank Name" value={employee.bankName || '—'} />
            <InfoRow label="Account Number" value={employee.accountNumber ? '••••' + employee.accountNumber.slice(-4) : '—'} />
            <InfoRow label="IFSC Code" value={employee.ifscCode || '—'} />
            <InfoRow label="Account Holder" value={employee.accountHolderName || '—'} />
          </div>
        </div>

        {/* Annual Paid Leave Entitlement & Balance */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarCheck size={18} style={{ color: '#06b6d4' }} /> Annual Paid Leave Balance
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px', background: 'rgba(6, 182, 212, 0.12)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.25)' }}>
              {leaveBalance.periodLabel}
            </span>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.65rem', marginBottom: '1rem' }}>
            <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.18)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Annual Total</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0891b2', marginTop: '0.15rem' }}>
                {leaveBalance.annualTotal} {leaveBalance.annualTotal === 1 ? 'leave' : 'leaves'}
              </div>
            </div>

            <div style={{ padding: '0.65rem', borderRadius: '8px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Leaves Used</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#d97706', marginTop: '0.15rem' }}>
                {leaveBalance.usedThisYear} {leaveBalance.usedThisYear === 1 ? 'leave' : 'leaves'}
              </div>
              {Number(leaveBalance.openingPaidLeavesUsed || 0) > 0 && (
                <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                  ({leaveBalance.openingPaidLeavesUsed} opening + {leaveBalance.payrollUsedThisYear || 0} payroll)
                </div>
              )}
            </div>

            <div style={{ padding: '0.65rem', borderRadius: '8px', background: leaveBalance.remainingAnnual > 0 ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)', border: `1px solid ${leaveBalance.remainingAnnual > 0 ? 'rgba(22,163,74,0.18)' : 'rgba(220,38,38,0.18)'}`, textAlign: 'center' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Remaining</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: leaveBalance.remainingAnnual > 0 ? '#16a34a' : '#dc2626', marginTop: '0.15rem' }}>
                {leaveBalance.remainingAnnual} {leaveBalance.remainingAnnual === 1 ? 'leave' : 'leaves'}
              </div>
            </div>
          </div>

          {/* Policy Notification Banner */}
          <div style={{
            padding: '0.75rem 0.85rem',
            borderRadius: '8px',
            fontSize: '0.8rem',
            lineHeight: 1.45,
            fontWeight: 500,
            marginBottom: '0.75rem',
            background: leaveBalance.blockNumber === 0
              ? 'rgba(245,158,11,0.08)'
              : leaveBalance.blockNumber === 1
              ? 'rgba(22,163,74,0.08)'
              : 'rgba(59,130,246,0.08)',
            border: `1px solid ${
              leaveBalance.blockNumber === 0
                ? 'rgba(245,158,11,0.25)'
                : leaveBalance.blockNumber === 1
                ? 'rgba(22,163,74,0.25)'
                : 'rgba(59,130,246,0.25)'
            }`,
            color: leaveBalance.blockNumber === 0
              ? '#b45309'
              : leaveBalance.blockNumber === 1
              ? '#15803d'
              : '#1d4ed8',
          }}>
            {leaveBalance.blockNumber === 0 && (
              <span>⏳ <strong>Probation Active (Months 1–6):</strong> 0 paid leaves available during first 6 months. 6 annual paid leaves unlock automatically after completing 6 months from joining date ({formatDateDDMMYYYY(employee.joiningDate)}).</span>
            )}
            {leaveBalance.blockNumber === 1 && (
              <span>🎉 <strong>Months 7–12 Active:</strong> 6 annual paid leaves unlocked!</span>
            )}
            {leaveBalance.blockNumber === 2 && (
              <span>🏆 <strong>1+ Year Completed:</strong> 6 annual paid leaves active. Any unused leaves are eligible for encashment into salary ({formatINR(leaveBalance.encashmentAmount)}).</span>
            )}
          </div>

          {/* Usage History / Info */}
          {(() => {
            const openingUsed = Number(leaveBalance.openingPaidLeavesUsed || (employee as any).openingPaidLeavesUsed || 0);
            const usedPayrolls = employee.monthlyPayrolls.filter((p: any) => Number(p.paidLeaveAdjustment || 0) > 0);
            if (usedPayrolls.length === 0 && openingUsed === 0) {
              return (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                  No paid leaves adjusted or previously availed so far.
                </div>
              );
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Leave Usage Breakdown:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {openingUsed > 0 && (
                    <span style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem', borderRadius: '5px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', color: '#eab308' }}>
                      <strong>Opening (Pre-System Availed):</strong> {openingUsed} {openingUsed === 1 ? 'leave day' : 'leave days'}
                    </span>
                  )}
                  {usedPayrolls.map((p: any) => (
                    <span key={p.id} style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)' }}>
                      <strong>{getMonthName(p.month)} {p.year}:</strong> {Number(p.paidLeaveAdjustment)} leave day{Number(p.paidLeaveAdjustment) === 1 ? '' : 's'}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Quick guide on how to apply */}
          <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
            💡 <strong>How to apply paid leaves:</strong> When an employee has unpaid absence (LOP) in any month, go to <Link href="/dashboard/payroll" style={{ color: '#06b6d4', textDecoration: 'underline' }}>Monthly Payroll</Link> ➔ click <strong>Edit Deductions</strong> on that employee ➔ enter <strong>Paid Leave Adjustment</strong> days. This waives their LOP deduction and marks the leave as used.
          </div>
        </div>
      </div>

      {/* Salary History */}
      {employee.monthlyPayrolls.length > 0 && (
        <div className="glass-card-static" style={{ marginTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} style={{ color: '#8b5cf6' }} /> Salary History
          </h3>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Present</th>
                  <th>LOP</th>
                  <th>Gross</th>
                  <th>Deductions</th>
                  <th>Net Salary</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {employee.monthlyPayrolls.map((p: any) => (
                  <tr key={p.id}>
                    <td>{getMonthName(p.month)} {p.year}</td>
                    <td>{Number(p.presentDays)}</td>
                    <td>{Number(p.lopDays)}</td>
                    <td>{formatINR(Number(p.grossSalary))}</td>
                    <td style={{ color: '#ef4444' }}>{formatINR(Number(p.totalDeduction))}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(Number(p.netSalary))}</td>
                    <td>
                      <span className={`badge badge-${p.status === 'APPROVED' ? 'approved' : p.status === 'FINALIZED' ? 'finalized' : 'draft'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, color: color || (highlight ? '#06b6d4' : 'var(--text-primary)'), fontSize: '0.875rem' }}>
        {value}
      </span>
    </div>
  );
}
