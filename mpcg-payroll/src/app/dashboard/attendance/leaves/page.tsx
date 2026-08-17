import { prisma } from '@/lib/prisma';
import LeaveModal from './LeaveModal';
import LeaveRowActions from './LeaveRowActions';

export default async function LeavesPage() {
  const leaves = await prisma.leave.findMany({
    include: {
      employee: { select: { employeeId: true, name: true, department: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, employeeId: true, department: true },
    orderBy: { name: 'asc' },
  });

  const statusBadge: Record<string, string> = {
    PENDING: 'badge-warning',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-error',
    CANCELLED: 'badge-draft',
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">{leaves.length} leave records recorded</p>
        </div>
        <LeaveModal employees={employees} />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>ID</th>
              <th>From</th>
              <th>To</th>
              <th>Type</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Approved By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center text-muted" style={{ padding: '3.5rem 1rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    No Leave Records Found
                  </div>
                  <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                    Click the <strong>&quot;+ Apply / Add Leave&quot;</strong> button above to record paid leave, casual leave, sick leave, or unpaid absence for any employee.
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
                      <div>{leave.employee.name}</div>
                      {leave.employee.department && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{leave.employee.department}</div>
                      )}
                    </td>
                    <td className="font-mono text-muted text-sm">{leave.employee.employeeId}</td>
                    <td className="text-sm font-mono">{fromStr}</td>
                    <td className="text-sm font-mono">{toStr}</td>
                    <td>
                      <span className="badge badge-info">
                        {leave.leaveType.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${statusBadge[leave.status] || 'badge-draft'}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="text-sm text-muted" style={{ maxWidth: '200px' }}>
                      {leave.reason || '—'}
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
