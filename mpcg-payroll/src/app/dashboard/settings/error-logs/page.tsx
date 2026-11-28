import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { redirect } from 'next/navigation';
import { getSystemErrors } from '@/lib/error-logger';
import ErrorLogsClient from './ErrorLogsClient';

export const dynamic = 'force-dynamic';

export default async function SystemErrorLogsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  if (!hasPermission(session.user, 'users.manage') && session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const initialLogs = getSystemErrors(150);

  return <ErrorLogsClient initialLogs={initialLogs} />;
}
