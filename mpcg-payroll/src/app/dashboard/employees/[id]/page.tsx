import { getEmployeeById } from '@/actions/employees';
import { formatINR, getMonthName } from '@/lib/currency-utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, User, Building, CreditCard, Clock } from 'lucide-react';
import EmployeeActions from './EmployeeActions';

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const employee = await getEmployeeById(id);

  if (!employee) notFound();

  const activeSalary = employee.salaryStructures.find((s: any) => s.isActive);
  const monthlyTotal = activeSalary
    ? Number(activeSalary.basicSalary)
    : 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/employees" className="btn btn-ghost btn-icon" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">{employee.name}</h1>
            <p className="page-subtitle">
              {employee.employeeId} · {employee.designation || 'No designation'} · Biometric: {employee.biometricId}
            </p>
          </div>
        </div>
        <EmployeeActions employeeId={employee.id} status={employee.status} />
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

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Personal Info */}
        <div className="glass-card-static">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: '#06b6d4' }} /> Personal Information
          </h3>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <InfoRow label="Employee ID" value={employee.employeeId} />
            <InfoRow label="Name" value={employee.name} />
            <InfoRow label="Date of Birth" value={employee.dateOfBirth?.toLocaleDateString('en-IN') || '—'} />
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
            <InfoRow label="Joining Date" value={employee.joiningDate?.toLocaleDateString('en-IN') || '—'} />
            <InfoRow label="Employment Type" value={employee.employmentType?.replace('_', ' ') || '—'} />
            <InfoRow label="Reporting Manager" value={employee.reportingManager || '—'} />
            <InfoRow label="Biometric ID" value={employee.biometricId} />
            <InfoRow label="Standard Hours" value={`${Number(employee.standardWorkingHours || 9)} Hours / day`} />
            <InfoRow label="Shift Timing" value={`${(employee as any).shiftStartTime || '09:00'} - ${(employee as any).shiftEndTime || '18:00'}`} />
            <InfoRow label="Late Threshold" value={`${(employee as any).lateThresholdMinutes ?? 15} mins`} />
            <InfoRow label="Half Day Threshold" value={`${Number((employee as any).halfDayThreshold ?? 5)} Hours`} />
            <InfoRow label="Overtime After" value={`${Number((employee as any).overtimeAfterHours ?? employee.standardWorkingHours ?? 9)} Hours`} />
            <InfoRow label="Strict Late Penalty" value={(employee as any).strictLateRule === true ? 'Active (3 Lates = 0.5 LOP & ≥30m = Half Day)' : 'Disabled (Off)'} />
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
              <InfoRow label="Overtime Eligible" value={activeSalary.overtimeEligible ? 'Yes' : 'No'} />
              <InfoRow label="Effective From" value={activeSalary.effectiveDate.toLocaleDateString('en-IN')} />
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
                    <td>{p.presentDays}</td>
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

function InfoRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 700 : 500, color: highlight ? '#06b6d4' : 'var(--text-primary)', fontSize: '0.875rem' }}>
        {value}
      </span>
    </div>
  );
}
