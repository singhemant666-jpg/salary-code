import { prisma } from '@/lib/prisma';

export interface AuditLogInput {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
}

/**
 * Format user identity string with Name, Email and Role
 */
export function formatUserIdentity(user?: { name?: string | null; email?: string | null; role?: string | null } | null): string {
  if (!user) return 'System / Automated';
  const name = user.name || 'Admin';
  const email = user.email ? ` <${user.email}>` : '';
  const role = user.role ? ` [${user.role}]` : '';
  return `${name}${email}${role}`;
}

/**
 * Create an audit log entry safely
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    let ipAddress = input.ipAddress;
    if (!ipAddress) {
      try {
        const { headers } = await import('next/headers');
        const headerList = await headers();
        const forwarded = headerList.get('x-forwarded-for');
        ipAddress = forwarded ? forwarded.split(',')[0].trim() : (headerList.get('x-real-ip') || undefined);
      } catch {
        // Not in an active request context
      }
    }

    const oldValueStr = input.oldValue !== undefined && input.oldValue !== null
      ? (typeof input.oldValue === 'string' ? input.oldValue : JSON.stringify(input.oldValue))
      : null;

    const newValueStr = input.newValue !== undefined && input.newValue !== null
      ? (typeof input.newValue === 'string' ? input.newValue : JSON.stringify(input.newValue))
      : null;

    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userName: input.userName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValue: oldValueStr,
        newValue: newValueStr,
        reason: input.reason,
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw — audit logging should not break the main transaction
  }
}

/**
 * Helper to detect changed fields between old and new objects
 */
export function getChangedFields(
  oldObj: Record<string, any>,
  newObj: Record<string, any>
): {
  oldValue: Record<string, any>;
  newValue: Record<string, any>;
  changedKeys: string[];
  summary: string;
} {
  const oldValue: Record<string, any> = {};
  const newValue: Record<string, any> = {};
  const changedKeys: string[] = [];

  const allKeys = Array.from(new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]));

  for (const key of allKeys) {
    const valA = oldObj ? oldObj[key] : undefined;
    const valB = newObj ? newObj[key] : undefined;

    // Normalize dates and decimals
    const strA = valA instanceof Date ? valA.toISOString() : JSON.stringify(valA ?? null);
    const strB = valB instanceof Date ? valB.toISOString() : JSON.stringify(valB ?? null);

    if (strA !== strB) {
      oldValue[key] = valA ?? null;
      newValue[key] = valB ?? null;
      changedKeys.push(key);
    }
  }

  const summary = changedKeys.length === 0
    ? 'No field changes detected'
    : `Changed ${changedKeys.length} field(s): ${changedKeys.map(k => `${k} (${JSON.stringify(oldValue[k])} → ${JSON.stringify(newValue[k])})`).join(', ')}`;

  return { oldValue, newValue, changedKeys, summary };
}
