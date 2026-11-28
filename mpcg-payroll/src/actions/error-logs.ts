'use server';

import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import {
  logSystemError,
  getSystemErrors,
  clearSystemErrors,
  type SystemErrorEntry,
} from '@/lib/error-logger';

export async function reportClientError(payload: {
  source: string;
  message: string;
  digest?: string;
  stack?: string;
  path?: string;
}) {
  try {
    const err = new Error(payload.message || 'Client/UI Error');
    if (payload.stack) err.stack = payload.stack;
    if (payload.digest) (err as any).digest = payload.digest;
    logSystemError(payload.source, err, {
      path: payload.path || 'unknown',
      reportedFrom: 'client-boundary',
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}

export async function fetchSystemErrorLogs(): Promise<{
  success: boolean;
  logs: SystemErrorEntry[];
  message?: string;
}> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, logs: [], message: 'Unauthorized' };
  }
  if (!hasPermission(session.user, 'users.manage') && session.user.role !== 'SUPER_ADMIN') {
    return { success: false, logs: [], message: 'Permission denied' };
  }
  return {
    success: true,
    logs: getSystemErrors(150),
  };
}

export async function clearSystemErrorLogs(): Promise<{ success: boolean; message?: string }> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, message: 'Unauthorized' };
  }
  if (!hasPermission(session.user, 'users.manage') && session.user.role !== 'SUPER_ADMIN') {
    return { success: false, message: 'Permission denied' };
  }
  clearSystemErrors();
  return { success: true };
}
