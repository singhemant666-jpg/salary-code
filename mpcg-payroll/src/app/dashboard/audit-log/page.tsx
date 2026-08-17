import { prisma } from '@/lib/prisma';

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || '1');
  const entity = params.entity || '';

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * 50,
      take: 50,
    }),
    prisma.auditLog.count({ where: where as never }),
  ]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Log</h1>
          <p className="page-subtitle">{total} records · Every important change is tracked</p>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Old Value</th>
              <th>New Value</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No audit log entries yet.
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id}>
                  <td className="text-sm font-mono text-muted" style={{ whiteSpace: 'nowrap' }}>
                    {log.createdAt.toLocaleString('en-IN')}
                  </td>
                  <td className="text-sm">{log.userName || '—'}</td>
                  <td>
                    <span className={`badge ${
                      log.action === 'CREATE' ? 'badge-success' :
                      log.action === 'DELETE' ? 'badge-error' :
                      log.action === 'APPROVE' ? 'badge-approved' :
                      log.action === 'FINALIZE' ? 'badge-finalized' :
                      log.action === 'REOPEN' ? 'badge-warning' :
                      'badge-info'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="text-sm">{log.entity}</td>
                  <td className="text-sm text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.oldValue ? JSON.stringify(JSON.parse(log.oldValue)).substring(0, 80) : '—'}
                  </td>
                  <td className="text-sm text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.newValue ? JSON.stringify(JSON.parse(log.newValue)).substring(0, 80) : '—'}
                  </td>
                  <td className="text-sm text-muted">{log.reason || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
