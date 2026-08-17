import { prisma } from '@/lib/prisma';
import { formatINR } from '@/lib/currency-utils';
import {
  Users,
  CalendarClock,
  Wallet,
  TrendingUp,
  AlertTriangle,
  FileText,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch stats
  const [
    totalEmployees,
    activeEmployees,
    currentPayrolls,
    missingPunches,
    pendingLeaves,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.monthlyPayroll.findMany({
      where: { month: currentMonth, year: currentYear },
    }),
    prisma.attendanceDaily.count({
      where: {
        status: 'MISSING_PUNCH',
        date: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lte: new Date(currentYear, currentMonth, 0),
        },
      },
    }),
    prisma.leave.count({ where: { status: 'PENDING' } }),
  ]);

  const processedCount = currentPayrolls.filter((p: any) => p.status !== 'DRAFT').length;
  const grossTotal = currentPayrolls.reduce((sum: number, p: any) => sum + Number(p.grossSalary), 0);
  const netTotal = currentPayrolls.reduce((sum: number, p: any) => sum + Number(p.netSalary), 0);
  const deductionTotal = currentPayrolls.reduce((sum: number, p: any) => sum + Number(p.totalDeduction), 0);

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {months[currentMonth]} {currentYear} · Payroll Overview
          </p>
        </div>
        <div className="flex-gap">
          <Link href="/dashboard/attendance/import" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <CalendarClock size={16} />
            Import Attendance
          </Link>
          <Link href="/dashboard/payroll" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            <Wallet size={16} />
            Process Payroll
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 stagger" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Active Employees</div>
              <div className="stat-value">{activeEmployees}</div>
              <div className="stat-subtitle">of {totalEmployees} total</div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(34,197,94,0.1)' }}>
              <Users size={22} style={{ color: '#22c55e' }} />
            </div>
          </div>
        </div>

        <div className="stat-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Payroll Processed</div>
              <div className="stat-value">{processedCount}/{currentPayrolls.length}</div>
              <div className="stat-subtitle">{currentPayrolls.length - processedCount} pending</div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(59,130,246,0.1)' }}>
              <CheckCircle2 size={22} style={{ color: '#3b82f6' }} />
            </div>
          </div>
        </div>

        <div className="stat-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Missing Punches</div>
              <div className="stat-value" style={{ color: missingPunches > 0 ? '#f59e0b' : undefined }}>{missingPunches}</div>
              <div className="stat-subtitle">this month</div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(245,158,11,0.1)' }}>
              <AlertTriangle size={22} style={{ color: '#f59e0b' }} />
            </div>
          </div>
        </div>

        <div className="stat-card animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="stat-label">Pending Leaves</div>
              <div className="stat-value">{pendingLeaves}</div>
              <div className="stat-subtitle">awaiting approval</div>
            </div>
            <div style={{ padding: '0.5rem', borderRadius: '10px', background: 'rgba(139,92,246,0.1)' }}>
              <Clock size={22} style={{ color: '#8b5cf6' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid-3" style={{ marginBottom: '1.5rem' }}>
        <div className="glass-card-static">
          <div className="stat-label">Gross Salary</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.5rem' }}>
            {formatINR(grossTotal)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Total earnings for {months[currentMonth]}
          </div>
        </div>

        <div className="glass-card-static">
          <div className="stat-label">Total Deductions</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444', marginTop: '0.5rem' }}>
            {formatINR(deductionTotal)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            LOP + Advances + Other
          </div>
        </div>

        <div className="glass-card-static" style={{ borderColor: 'rgba(6,182,212,0.2)' }}>
          <div className="stat-label">Net Payable</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4', marginTop: '0.5rem' }}>
            {formatINR(netTotal)}
          </div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            After all deductions
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card-static">
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Quick Actions</h3>
        <div className="grid-4">
          <Link href="/dashboard/employees/new" style={{ textDecoration: 'none' }}>
            <div style={quickActionStyle}>
              <Users size={24} style={{ color: '#06b6d4', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Add Employee</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>New employee record</div>
            </div>
          </Link>
          <Link href="/dashboard/attendance/import" style={{ textDecoration: 'none' }}>
            <div style={quickActionStyle}>
              <CalendarClock size={24} style={{ color: '#22c55e', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Import Attendance</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Upload RS 70 data</div>
            </div>
          </Link>
          <Link href="/dashboard/payroll" style={{ textDecoration: 'none' }}>
            <div style={quickActionStyle}>
              <TrendingUp size={24} style={{ color: '#f59e0b', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Process Payroll</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Calculate salaries</div>
            </div>
          </Link>
          <Link href="/dashboard/salary-slips" style={{ textDecoration: 'none' }}>
            <div style={quickActionStyle}>
              <FileText size={24} style={{ color: '#8b5cf6', marginBottom: '0.75rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Salary Slips</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Generate & download</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Payroll Table */}
      {currentPayrolls.length > 0 && (
        <div className="glass-card-static" style={{ marginTop: '1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ color: 'var(--text-primary)' }}>Payroll Status Pipeline</h3>
            <Link href="/dashboard/payroll" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {['DRAFT', 'CALCULATED', 'UNDER_REVIEW', 'APPROVED', 'FINALIZED', 'SALARY_SLIP_GENERATED'].map(status => {
              const count = currentPayrolls.filter((p: any) => p.status === status).length;
              const badgeClass = {
                DRAFT: 'badge-draft',
                CALCULATED: 'badge-calculated',
                UNDER_REVIEW: 'badge-review',
                APPROVED: 'badge-approved',
                FINALIZED: 'badge-finalized',
                SALARY_SLIP_GENERATED: 'badge-generated',
              }[status];

              return (
                <div key={status} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: 'var(--bg-glass)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-primary)',
                }}>
                  <span className={`badge ${badgeClass}`}>
                    {status.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const quickActionStyle: React.CSSProperties = {
  padding: '1.25rem',
  borderRadius: '12px',
  background: 'var(--bg-glass)',
  border: '1px solid var(--border-primary)',
  cursor: 'pointer',
  transition: 'all 250ms ease',
  textAlign: 'center',
};
