import { prisma } from '@/lib/prisma';
import { getShiftOverrides } from '@/actions/shift-overrides';
import ShiftOverrideModal from './ShiftOverrideModal';
import ShiftApprovalActions from './ShiftApprovalActions';
import Link from 'next/link';
import { Clock, Calendar, Users, ShieldAlert, FileText, CheckCircle2, AlertCircle, AlertTriangle, XCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ShiftOverridesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusFilter } = (await searchParams) || {};
  const allOverrides = await getShiftOverrides();

  const pendingCount = allOverrides.filter((o: any) => o.status === 'PENDING').length;
  const approvedCount = allOverrides.filter((o: any) => o.status === 'APPROVED' || !o.status).length;
  const rejectedCount = allOverrides.filter((o: any) => o.status === 'REJECTED').length;

  const overrides = statusFilter && statusFilter !== 'ALL'
    ? allOverrides.filter((o: any) => (o.status || 'APPROVED') === statusFilter)
    : allOverrides;

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, employeeId: true, department: true },
    orderBy: { name: 'asc' },
  });

  const uniqueEmployees = new Set(overrides.map((o: any) => o.employeeId)).size;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Main Action */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={24} style={{ color: '#818cf8' }} />
            Shift Timing Management & Roster
          </h1>
          <p className="page-subtitle">
            Manage date-wise custom shift timings and approve employee shift override requests to update office schedule & waive late penalty deductions
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/apply-leave"
            target="_blank"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', gap: '0.4rem' }}
          >
            ↗ Employee Portal
          </Link>
          <ShiftOverrideModal employees={employees} />
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        <Link href="/dashboard/attendance" className="btn btn-sm btn-ghost" style={{ fontSize: '0.85rem' }}>
          📅 Daily Attendance Log
        </Link>
        <Link href="/dashboard/attendance/leaves" className="btn btn-sm btn-ghost" style={{ fontSize: '0.85rem' }}>
          📄 Leave Applications
        </Link>
        <Link href="/dashboard/attendance/shifts" className="btn btn-sm btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
          ⏰ Shift Timing Overrides ({allOverrides.length})
        </Link>
      </div>

      {/* Pending Approvals Alert Banner */}
      {pendingCount > 0 && (
        <div style={{
          padding: '0.875rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
            <div>
              <strong style={{ color: '#fbbf24', fontSize: '0.9rem' }}>
                {pendingCount} Employee Shift Timing Override Request{pendingCount > 1 ? 's' : ''} Awaiting Approval
              </strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Approve requests to update their shift timing so late coming will not be deducted for those dates.
              </div>
            </div>
          </div>
          <Link
            href="/dashboard/attendance/shifts?status=PENDING"
            className="btn btn-sm"
            style={{
              background: '#f59e0b',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.75rem',
              borderRadius: '6px',
              textDecoration: 'none',
              padding: '0.35rem 0.75rem',
            }}
          >
            Review Pending Requests ({pendingCount})
          </Link>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Stat 1: Total Overrides */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Total Overrides
            </span>
            <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.2 }}>
              {allOverrides.length}
            </strong>
          </div>
        </div>

        {/* Stat 2: Pending Approval */}
        <div
          className="glass-card-static"
          style={{
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            borderLeft: pendingCount > 0 ? '3.5px solid #f59e0b' : undefined,
          }}
        >
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', display: 'flex' }}>
            <AlertCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Pending Approval
            </span>
            <strong style={{ fontSize: '1.4rem', color: pendingCount > 0 ? '#fbbf24' : 'var(--text-primary)', fontWeight: 800, lineHeight: 1.2 }}>
              {pendingCount}
            </strong>
          </div>
        </div>

        {/* Stat 3: Approved & Active */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3.5px solid #22c55e' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'flex' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Approved & Active
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#22c55e', fontWeight: 800, lineHeight: 1.2 }}>
              {approvedCount}
            </strong>
          </div>
        </div>

        {/* Stat 4: Employees Affected */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3.5px solid #06b6d4' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', display: 'flex' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Employees Managed
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#06b6d4', fontWeight: 800, lineHeight: 1.2 }}>
              {uniqueEmployees}
            </strong>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
        <Link
          href="/dashboard/attendance/shifts"
          className={`btn btn-sm ${!statusFilter || statusFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ textDecoration: 'none', fontSize: '0.8rem' }}
        >
          All ({allOverrides.length})
        </Link>
        <Link
          href="/dashboard/attendance/shifts?status=PENDING"
          className={`btn btn-sm ${statusFilter === 'PENDING' ? 'btn-primary' : 'btn-secondary'}`}
          style={{
            textDecoration: 'none',
            fontSize: '0.8rem',
            background: statusFilter === 'PENDING' ? '#f59e0b' : undefined,
            borderColor: statusFilter === 'PENDING' ? '#f59e0b' : undefined,
            color: statusFilter === 'PENDING' ? '#000' : undefined,
          }}
        >
          ⏳ Pending ({pendingCount})
        </Link>
        <Link
          href="/dashboard/attendance/shifts?status=APPROVED"
          className={`btn btn-sm ${statusFilter === 'APPROVED' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ textDecoration: 'none', fontSize: '0.8rem' }}
        >
          ✅ Approved ({approvedCount})
        </Link>
        {rejectedCount > 0 && (
          <Link
            href="/dashboard/attendance/shifts?status=REJECTED"
            className={`btn btn-sm ${statusFilter === 'REJECTED' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ textDecoration: 'none', fontSize: '0.8rem' }}
          >
            ❌ Rejected ({rejectedCount})
          </Link>
        )}
      </div>

      {/* Main Shift Overrides Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee / Doctor</th>
              <th>ID</th>
              <th>From Date</th>
              <th>To Date</th>
              <th>Custom Shift Timing</th>
              <th>Status</th>
              <th>Reason / Note</th>
              <th>Submitted / Approved By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {overrides.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted" style={{ padding: '3.5rem 1rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    {statusFilter === 'PENDING' ? 'No Pending Shift Timing Override Requests' : 'No Custom Shift Timing Overrides Configured'}
                  </div>
                  <p style={{ fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.25rem', color: 'var(--text-secondary)' }}>
                    {statusFilter === 'PENDING'
                      ? 'All employee shift timing requests have been reviewed.'
                      : 'To configure an employee or doctor shift timing for specific dates, click "Add Shift Override".'}
                  </p>
                  <ShiftOverrideModal employees={employees} />
                </td>
              </tr>
            ) : (
              overrides.map((override: any) => {
                const fromDateObj = new Date(override.fromDate);
                const toDateObj = new Date(override.toDate);
                const fromStr = fromDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
                const toStr = toDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
                const status = override.status || 'APPROVED';

                return (
                  <tr
                    key={override.id}
                    style={{
                      background: status === 'PENDING' ? 'rgba(245, 158, 11, 0.04)' : undefined,
                    }}
                  >
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{override.employee.name}</div>
                      {override.employee.department && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{override.employee.department}</div>
                      )}
                    </td>
                    <td className="font-mono text-muted text-sm">{override.employee.employeeId}</td>
                    <td className="text-sm font-mono">{fromStr}</td>
                    <td className="text-sm font-mono">{toStr}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        ⏰ {override.shiftStartTime} – {override.shiftEndTime}
                      </span>
                    </td>
                    <td>
                      {status === 'PENDING' && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#fbbf24',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <AlertCircle size={12} />
                          Pending Approval
                        </span>
                      )}
                      {status === 'APPROVED' && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(34, 197, 94, 0.15)',
                            color: '#4ade80',
                            border: '1px solid rgba(34, 197, 94, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Approved
                        </span>
                      )}
                      {status === 'REJECTED' && (
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '6px',
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                          title={override.rejectionReason || 'Rejected by HR'}
                        >
                          <XCircle size={12} />
                          Rejected
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-secondary" style={{ maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span title={override.reason || ''}>{override.reason || '—'}</span>
                    </td>
                    <td className="text-sm text-muted">
                      <div>{override.createdBy || 'HR Admin'}</div>
                      {override.approvedBy && status === 'APPROVED' && (
                        <div style={{ fontSize: '0.7rem', color: '#4ade80' }}>
                          Approved by {override.approvedBy}
                        </div>
                      )}
                      {override.rejectionReason && status === 'REJECTED' && (
                        <div style={{ fontSize: '0.7rem', color: '#f87171' }}>
                          Note: {override.rejectionReason}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ShiftApprovalActions
                        id={override.id}
                        status={status}
                        employeeName={override.employee.name}
                      />
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
