import { prisma } from '@/lib/prisma';
import LeaveModal from './LeaveModal';
import LeaveRowActions from './LeaveRowActions';
import LeaveReasonModal from './LeaveReasonModal';
import { Calendar, Clock, CheckCircle2, XCircle, FileText, Filter } from 'lucide-react';

export default async function LeavesPage() {
  const leaves = await prisma.leave.findMany({
    include: {
      employee: { select: { employeeId: true, name: true, department: true, mobile: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, employeeId: true, department: true },
    orderBy: { name: 'asc' },
  });

  const pendingCount = leaves.filter(l => l.status === 'PENDING').length;
  const approvedCount = leaves.filter(l => l.status === 'APPROVED').length;
  const rejectedCount = leaves.filter(l => l.status === 'REJECTED').length;

  const statusBadge: Record<string, string> = {
    PENDING: 'badge-warning',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-error',
    CANCELLED: 'badge-draft',
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Main Action */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={24} style={{ color: '#6366f1' }} />
            Leave Management Panel
          </h1>
          <p className="page-subtitle">Track, review, and approve employee leave applications & letters</p>
        </div>
        <LeaveModal employees={employees} />
      </div>

      {/* KPI Stats Bar (Impeccable Design Quality) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        {/* Stat 1: Total Applications */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', display: 'flex' }}>
            <FileText size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Total Requests
            </span>
            <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.2 }}>
              {leaves.length}
            </strong>
          </div>
        </div>

        {/* Stat 2: Pending Approval */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3.5px solid #eab308' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.12)', color: '#facc15', display: 'flex' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Pending Review
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#eab308', fontWeight: 800, lineHeight: 1.2 }}>
              {pendingCount}
            </strong>
          </div>
        </div>

        {/* Stat 3: Approved Leaves */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3.5px solid #22c55e' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', color: '#4ade80', display: 'flex' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Approved
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#22c55e', fontWeight: 800, lineHeight: 1.2 }}>
              {approvedCount}
            </strong>
          </div>
        </div>

        {/* Stat 4: Rejected Leaves */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3.5px solid #ef4444' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', display: 'flex' }}>
            <XCircle size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Rejected
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#ef4444', fontWeight: 800, lineHeight: 1.2 }}>
              {rejectedCount}
            </strong>
          </div>
        </div>
      </div>

      {/* Main Leave Applications Table Card */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>ID</th>
              <th>From</th>
              <th>To</th>
              <th>Type / Shift</th>
              <th>Status</th>
              <th>Reason / Letter</th>
              <th>Approved By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted" style={{ padding: '3.5rem 1rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    No Leave Applications Recorded
                  </div>
                  <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--text-secondary)' }}>
                    Applications submitted by employees via the Leave Portal or created by HR will appear here automatically.
                  </p>
                  <LeaveModal employees={employees} />
                </td>
              </tr>
            ) : (
              leaves.map((leave: any) => {
                const fromStr = leave.fromDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
                const toStr = leave.toDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

                return (
                  <tr key={leave.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{leave.employee.name}</div>
                      {leave.mobileNumber || leave.employee.mobile ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          📱 {leave.mobileNumber || leave.employee.mobile}
                        </div>
                      ) : (
                        leave.employee.department && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{leave.employee.department}</div>
                        )
                      )}
                    </td>
                    <td className="font-mono text-muted text-sm">{leave.employee.employeeId}</td>
                    <td className="text-sm font-mono">{fromStr}</td>
                    <td className="text-sm font-mono">{toStr}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 600 }}>
                        {leave.leaveType.replace('_', ' ')}
                      </span>
                      {leave.isHalfDay && (
                        <div style={{ fontSize: '0.72rem', color: '#a5b4fc', marginTop: '3px', fontWeight: 600 }}>
                          Half Day {leave.halfDayTime ? `(${leave.halfDayTime})` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[leave.status] || 'badge-draft'}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>
                      <LeaveReasonModal
                        leave={{
                          id: leave.id,
                          status: leave.status,
                          reason: leave.reason,
                          employeeName: leave.employee.name,
                          employeeId: leave.employee.employeeId,
                          department: leave.employee.department,
                          mobileNumber: leave.mobileNumber || leave.employee.mobile,
                          fromDateStr: fromStr,
                          toDateStr: toStr,
                          leaveType: leave.leaveType,
                          isHalfDay: leave.isHalfDay,
                          halfDayTime: leave.halfDayTime,
                        }}
                      />
                    </td>
                    <td className="text-sm text-muted">
                      {leave.approvedBy || '—'}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <LeaveRowActions leaveId={leave.id} status={leave.status} />
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
