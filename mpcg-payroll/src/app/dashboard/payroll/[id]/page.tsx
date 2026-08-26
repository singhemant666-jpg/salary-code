import { getPayrollById, approvePayroll, finalizePayroll, calculateEmployeePayroll, getPaidLeaveBalance } from '@/actions/payroll';
import { formatINR, getMonthName } from '@/lib/currency-utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PayrollDetailActions from './PayrollDetailActions';
import EditDeductionsModal from '../EditDeductionsModal';

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payroll = await getPayrollById(id);

  if (!payroll) notFound();

  const emp = payroll.employee;

  // Fetch paid leave balance for this employee (6/year, 1 per 2-month period)
  const leaveBalance = await getPaidLeaveBalance(
    payroll.employeeId,
    payroll.year,
    payroll.month,
    payroll.id
  );
  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/payroll" className="btn btn-ghost btn-icon" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">{emp.name} — {getMonthName(payroll.month)} {payroll.year}</h1>
            <p className="page-subtitle">{emp.employeeId} · {emp.designation || 'Employee'}</p>
          </div>
        </div>
        <PayrollDetailActions payrollId={payroll.id} status={payroll.status} />
      </div>

      {/* Status */}
      <div style={{ marginBottom: '1.5rem' }}>
        <span className={`badge badge-${payroll.status === 'APPROVED' ? 'approved' : payroll.status === 'FINALIZED' ? 'finalized' : payroll.status === 'CALCULATED' ? 'calculated' : 'draft'}`} style={{ fontSize: '0.8125rem', padding: '0.375rem 1rem' }}>
          {payroll.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Attendance Summary */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', fontWeight: 700 }}>Attendance Summary</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="Total Days" value={String(payroll.totalDays)} />
            <InfoRow label="Present Days" value={String(payroll.presentDays)} color="#16a34a" />
            <InfoRow label="Paid Leave" value={String(payroll.paidLeaveDays)} color="#2563eb" />
            <InfoRow label="Weekly Offs" value={String(payroll.weeklyOffs)} />
            <InfoRow label="Holidays" value={String(payroll.holidays)} />
            <InfoRow label="LOP Days" value={String(Number(payroll.lopDays))} color="#d97706" />
            {Number((payroll as any).missingPunchDays) > 0 && (
              <InfoRow
                label="Missing Punches (Single Punch)"
                value={`${Number((payroll as any).missingPunchDays)} day(s) (Full Base Paid)`}
                color="#2563eb"
              />
            )}
            {Number((payroll as any).sandwichedDays) > 0 && (
              <InfoRow
                label={`Sandwich Rule (${Number((payroll as any).sandwichedDays)}d)`}
                value={`${Number((payroll as any).sandwichedDays)} Weekly-off(s) → LOP`}
                color="#dc2626"
              />
            )}
            {Number((payroll as any).paidLeaveAdjustment) > 0 && (
              <InfoRow
                label={`Paid Leave Adjusted (${Number((payroll as any).paidLeaveAdjustment)}d)`}
                value={`-${Number((payroll as any).paidLeaveAdjustment)} LOP days`}
                color="#16a34a"
              />
            )}
            <InfoRow label="Overtime Hours" value={`${Number(payroll.overtimeHours)}h`} color="#0891b2" />
            {Number((payroll as any).totalWorkingHours || 0) > 0 && (
              <>
                <InfoRow
                  label="Total Hours Worked"
                  value={`${Number((payroll as any).totalWorkingHours).toFixed(2)}h`}
                />
                <InfoRow
                  label="Average Working Hours"
                  value={`${(Number((payroll as any).totalWorkingHours) / (payroll.presentDays || 1)).toFixed(2)}h / day (${Number((payroll as any).totalWorkingHours).toFixed(2)}h / ${payroll.presentDays} days)`}
                  color="#0891b2"
                />
              </>
            )}
          </div>
        </div>

        {/* Earnings */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', color: '#16a34a', fontWeight: 700 }}>Earnings</h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="Basic Salary" value={formatINR(Number(payroll.basicSalary))} />
            <InfoRow
              label="Per-Day Salary Rate"
              value={`${formatINR(Number(payroll.basicSalary) / 30)} / day (${formatINR(Number(payroll.basicSalary))} ÷ 30)`}
              color="#2563eb"
            />
            <InfoRow
              label="Hourly Rate"
              value={`₹${((Number(payroll.basicSalary) / 30) / Number(emp.standardWorkingHours || 9)).toFixed(3)} / hr (${formatINR(Number(payroll.basicSalary) / 30)} ÷ ${emp.standardWorkingHours || 9}h)`}
              color="#7c3aed"
            />
            {Number(payroll.incentiveAmount) > 0 && (
              <InfoRow label="Incentive" value={formatINR(Number(payroll.incentiveAmount))} color="#16a34a" />
            )}
            {Number(payroll.bonusAmount) > 0 && (
              <InfoRow label="Bonus" value={formatINR(Number(payroll.bonusAmount))} color="#16a34a" />
            )}
            {Number(payroll.overtimeAmount) > 0 && (
              <InfoRow label="Overtime" value={formatINR(Number(payroll.overtimeAmount))} color="#0891b2" />
            )}
            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <InfoRow label="GROSS SALARY" value={formatINR(Number(payroll.grossSalary))} bold />
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div className="glass-card-static">
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: '#dc2626', fontWeight: 700 }}>Deductions</h3>
            <EditDeductionsModal
              payroll={{
                id: payroll.id,
                employeeName: emp.name,
                employeeId: emp.employeeId,
                grossSalary: Number(payroll.grossSalary),
                lopDeduction: Number(payroll.lopDeduction),
                lopDays: Number(payroll.lopDays),
                shortHoursDeduction: Number((payroll as any).shortHoursDeduction || 0),
                advanceDeduction: Number(payroll.advanceDeduction),
                otherDeduction: Number(payroll.otherDeduction),
                otherDeductionNote: payroll.otherDeductionNote,
                pfDeduction: Number(payroll.pfDeduction),
                totalDeduction: Number(payroll.totalDeduction),
                netSalary: Number(payroll.netSalary),
                basicSalary: Number(payroll.basicSalary),
                paidLeaveAdjustment: Number((payroll as any).paidLeaveAdjustment || 0),
                holdSalaryDeduction: Number((payroll as any).holdSalaryDeduction || 0),
              }}
              leaveBalance={leaveBalance}
            />
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {Number(payroll.lopDeduction) > 0 && (
              <InfoRow label="LOP Deduction" value={formatINR(Number(payroll.lopDeduction))} color="#dc2626" />
            )}
            {Number((payroll as any).shortHoursDeduction) > 0 && (
              <InfoRow 
                label={`Short Hours Deduction (${Number((payroll as any).shortWorkingHours || 0)}h)`} 
                value={formatINR(Number((payroll as any).shortHoursDeduction))} 
                color="#dc2626" 
              />
            )}
            {Number((payroll as any).holdSalaryDeduction) > 0 && (
              <InfoRow
                label="Joining Salary Hold (15 Days)"
                value={formatINR(Number((payroll as any).holdSalaryDeduction))}
                color="#d97706"
              />
            )}
            {Number(payroll.advanceDeduction) > 0 && (
              <InfoRow label="Advance" value={formatINR(Number(payroll.advanceDeduction))} color="#dc2626" />
            )}
            {Number(payroll.loanDeduction) > 0 && (
              <InfoRow label="Loan" value={formatINR(Number(payroll.loanDeduction))} color="#dc2626" />
            )}
            {Number(payroll.otherDeduction) > 0 && (
              <InfoRow label="Other Deduction" value={formatINR(Number(payroll.otherDeduction))} color="#dc2626" />
            )}
            {Number(payroll.pfDeduction) > 0 && (
              <InfoRow label="PF" value={formatINR(Number(payroll.pfDeduction))} color="#dc2626" />
            )}
            <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
              <InfoRow label="TOTAL DEDUCTION" value={formatINR(Number(payroll.totalDeduction))} bold color="#dc2626" />
            </div>
          </div>
        </div>

        {/* Net Salary */}
        <div className="glass-card-static" style={{ borderColor: 'rgba(8,145,178,0.3)' }}>
          <h3 style={{ marginBottom: '1rem', color: '#0891b2', fontWeight: 700 }}>Net Salary</h3>
          <div style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#0891b2',
            textAlign: 'center',
            padding: '1.25rem 0',
          }}>
            {formatINR(Number(payroll.netSalary))}
          </div>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 500 }}>
            Gross {formatINR(Number(payroll.grossSalary))} − Deductions {formatINR(Number(payroll.totalDeduction))}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span className="text-sm" style={{ color: 'var(--text-secondary)', fontWeight: bold ? 700 : 500 }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 600, color: color || 'var(--text-primary)', fontSize: bold ? '1rem' : '0.875rem' }}>
        {value}
      </span>
    </div>
  );
}
