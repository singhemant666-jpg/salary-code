import { prisma } from '@/lib/prisma';

interface AuditLogInput {
  userId?: string;
  userName?: string;
  action: string;
  entity: string;
  entityId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        userName: input.userName,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        oldValue: input.oldValue ? JSON.stringify(input.oldValue) : null,
        newValue: input.newValue ? JSON.stringify(input.newValue) : null,
        reason: input.reason,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw — audit logging should not break the main operation
  }
}

/**
 * Helper to detect changed fields between old and new objects
 */
export function getChangedFields(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): { oldValue: Record<string, unknown>; newValue: Record<string, unknown> } {
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  for (const key of Object.keys(newObj)) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      oldValue[key] = oldObj[key];
      newValue[key] = newObj[key];
    }
  }

  return { oldValue, newValue };
}
