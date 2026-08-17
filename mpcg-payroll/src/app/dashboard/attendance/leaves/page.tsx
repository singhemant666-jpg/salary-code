import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function LeavesPage() {
  const leaves = await prisma.leave.findMany({
    include: {
      employee: { select: { employeeId: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const statusBadge: Record<string, string> = {
    PENDING: 'badge-warning',
    APPROVED: 'badge-approved',
    REJECTED: 'badge-error',
    CANCELLED: 'badge-draft',
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">{leaves.length} leave records</p>
        </div>
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
            </tr>
          </thead>
          <tbody>
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No leave records found.
                </td>
              </tr>
            ) : (
              leaves.map((leave: any) => (
                <tr key={leave.id}>
                  <td style={{ fontWeight: 500 }}>{leave.employee.name}</td>
                  <td className="font-mono text-muted text-sm">{leave.employee.employeeId}</td>
                  <td className="text-sm">{leave.fromDate.toLocaleDateString('en-IN')}</td>
                  <td className="text-sm">{leave.toDate.toLocaleDateString('en-IN')}</td>
                  <td><span className="badge badge-info">{leave.leaveType.replace('_', ' ')}</span></td>
                  <td><span className={`badge ${statusBadge[leave.status]}`}>{leave.status}</span></td>
                  <td className="text-sm text-muted">{leave.reason || '—'}</td>
                  <td className="text-sm text-muted">{leave.approvedBy || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
