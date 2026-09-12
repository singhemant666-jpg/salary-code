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
  Sparkles,
  ArrowUpRight,
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
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Impeccable Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
            <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#06b6d4', fontWeight: 700 }}>
              {months[currentMonth]} {currentYear} Overview
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.025em' }}>
            Executive Dashboard
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Real-time workforce attendance, leaves & payroll analytics
          </p>
        </div>

        <div className="flex-gap">
          <Link href="/dashboard/attendance/import" className="btn btn-secondary" style={{ textDecoration: 'none', gap: '0.45rem' }}>
            <CalendarClock size={16} />
            Import Attendance
          </Link>
          <Link href="/dashboard/payroll" className="btn btn-primary" style={{ textDecoration: 'none', gap: '0.45rem', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}>
            <Wallet size={16} />
            Process Payroll
          </Link>
        </div>
      </div>

      {/* Top 4 KPI Stats Cards Grid (Impeccable Design System) */}
      <div className="grid-4 stagger">
        {/* Stat 1: Active Employees */}
        <div className="stat-card animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">Active Employees</span>
              <div className="stat-value">{activeEmployees}</div>
              <div className="stat-subtitle">of {totalEmployees} total registered</div>
            </div>
            <div style={{
              padding: '0.65rem',
              borderRadius: '12px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#4ade80'
            }}>
              <Users size={22} />
            </div>
          </div>
        </div>

        {/* Stat 2: Payroll Processed */}
        <div className="stat-card animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">Payroll Processed</span>
              <div className="stat-value">{processedCount}/{currentPayrolls.length}</div>
              <div className="stat-subtitle">{currentPayrolls.length - processedCount} pending calculation</div>
            </div>
            <div style={{
              padding: '0.65rem',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#60a5fa'
            }}>
              <CheckCircle2 size={22} />
            </div>
          </div>
        </div>

        {/* Stat 3: Missing Punches */}
        <div className="stat-card animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">Missing Punches</span>
              <div className="stat-value" style={{ color: missingPunches > 0 ? '#f59e0b' : 'var(--text-primary)' }}>
                {missingPunches}
              </div>
              <div className="stat-subtitle">unresolved this month</div>
            </div>
            <div style={{
              padding: '0.65rem',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#fbbf24'
            }}>
              <AlertTriangle size={22} />
            </div>
          </div>
        </div>

        {/* Stat 4: Pending Leaves */}
        <div className="stat-card animate-fade-in" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <span className="stat-label">Pending Leaves</span>
              <div className="stat-value" style={{ color: pendingLeaves > 0 ? '#a855f7' : 'var(--text-primary)' }}>
                {pendingLeaves}
              </div>
              <div className="stat-subtitle">awaiting HR approval</div>
            </div>
            <div style={{
              padding: '0.65rem',
              borderRadius: '12px',
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#c084fc'
            }}>
              <Clock size={22} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid-3">
        {/* Gross Salary */}
        <div className="glass-card-static" style={{ borderTop: '3.5px solid #6366f1', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Gross Salary</span>
            <span style={{ fontSize: '0.7rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              EARNINGS
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.4rem', fontFamily: 'monospace' }}>
            {formatINR(grossTotal)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Total earnings calculated for {months[currentMonth]}
          </div>
        </div>

        {/* Total Deductions */}
        <div className="glass-card-static" style={{ borderTop: '3.5px solid #ef4444', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Total Deductions</span>
            <span style={{ fontSize: '0.7rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              DEDUCTIONS
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#ef4444', marginTop: '0.4rem', fontFamily: 'monospace' }}>
            {formatINR(deductionTotal)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            LOP + Advance Repayments + Deductions
          </div>
        </div>

        {/* Net Payable */}
        <div className="glass-card-static" style={{ borderTop: '3.5px solid #06b6d4', padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Net Payable Salary</span>
            <span style={{ fontSize: '0.7rem', color: '#06b6d4', background: 'rgba(6, 182, 212, 0.12)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
              DISBURSAL
            </span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#06b6d4', marginTop: '0.4rem', fontFamily: 'monospace' }}>
            {formatINR(netTotal)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Final payout after all deductions
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="glass-card-static" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.15rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Quick Action Workflows
            </h3>
          </div>
        </div>

        <div className="grid-4" style={{ gap: '1rem' }}>
          <Link href="/dashboard/employees/new" style={{ textDecoration: 'none' }}>
            <div className="quick-action-card">
              <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.12)', color: '#06b6d4', width: 'fit-content', marginBottom: '0.85rem' }}>
                <Users size={22} />
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Add Employee</span>
                <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Create new employee profile</div>
            </div>
          </Link>

          <Link href="/dashboard/attendance/import" style={{ textDecoration: 'none' }}>
            <div className="quick-action-card">
              <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', color: '#22c55e', width: 'fit-content', marginBottom: '0.85rem' }}>
                <CalendarClock size={22} />
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Import Attendance</span>
                <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Upload RS 70 biometric logs</div>
            </div>
          </Link>

          <Link href="/dashboard/payroll" style={{ textDecoration: 'none' }}>
            <div className="quick-action-card">
              <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', color: '#f59e0b', width: 'fit-content', marginBottom: '0.85rem' }}>
                <TrendingUp size={22} />
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Process Payroll</span>
                <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Calculate & review monthly salary</div>
            </div>
          </Link>

          <Link href="/dashboard/salary-slips" style={{ textDecoration: 'none' }}>
            <div className="quick-action-card">
              <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', width: 'fit-content', marginBottom: '0.85rem' }}>
                <FileText size={22} />
              </div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Salary Slips</span>
                <ArrowUpRight size={14} style={{ opacity: 0.6 }} />
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Generate & download payslips</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Payroll Pipeline Widget */}
      {currentPayrolls.length > 0 && (
        <div className="glass-card-static" style={{ padding: '1.35rem 1.5rem' }}>
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Monthly Payroll Pipeline Status
            </h3>
            <Link href="/dashboard/payroll" className="btn btn-ghost" style={{ textDecoration: 'none', fontSize: '0.8rem', gap: '0.3rem' }}>
              View Full Pipeline <ArrowRight size={14} />
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                  gap: '0.6rem',
                  padding: '0.55rem 0.95rem',
                  background: 'var(--bg-glass)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-primary)',
                }}>
                  <span className={`badge ${badgeClass}`} style={{ fontWeight: 600 }}>
                    {status.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Global CSS for Quick Action Card Hover Effects */}
      <style>{`
        .quick-action-card {
          padding: 1.25rem;
          border-radius: 12px;
          background: var(--bg-glass);
          border: 1px solid var(--border-primary);
          cursor: pointer;
          transition: all 250ms ease;
        }
        .quick-action-card:hover {
          background: var(--bg-glass-hover);
          border-color: rgba(6, 182, 212, 0.4);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
