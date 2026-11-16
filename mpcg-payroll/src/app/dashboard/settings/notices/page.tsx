export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/prisma';
import { getBroadcastNotices, getEmployeeWarnings } from '@/actions/portal-notices';
import NoticesManagerClient from './NoticesManagerClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal Notices & Warnings | Settings',
};

export default async function NoticesSettingsPage() {
  const [broadcasts, warnings, employees] = await Promise.all([
    getBroadcastNotices(),
    getEmployeeWarnings(),
    prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        employeeId: true,
        department: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="animate-fade-in p-6 max-w-7xl mx-auto">
      <NoticesManagerClient
        initialBroadcasts={broadcasts}
        initialWarnings={warnings}
        employees={employees}
      />
    </div>
  );
}
