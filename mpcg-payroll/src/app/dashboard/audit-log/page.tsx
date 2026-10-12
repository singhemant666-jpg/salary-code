import { prisma } from '@/lib/prisma';
import AuditLogClient, { AuditRecord } from './AuditLogClient';

export const dynamic = 'force-dynamic';

export default async function AuditLogPage() {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 2000,
    }),
    prisma.auditLog.count(),
  ]);

  const serializedLogs: AuditRecord[] = logs.map((log: any) => ({
    id: log.id,
    userId: log.userId,
    userName: log.userName,
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    oldValue: log.oldValue,
    newValue: log.newValue,
    reason: log.reason,
    ipAddress: log.ipAddress,
    createdAt: log.createdAt.toISOString(),
  }));

  return <AuditLogClient initialLogs={serializedLogs} totalCount={total} />;
}
