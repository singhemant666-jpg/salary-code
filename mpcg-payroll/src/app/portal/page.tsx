import { getPortalSession } from '@/actions/portal-auth';
import { getPortalDashboardData } from '@/actions/portal-data';
import { ensureDatabaseSchemaSynced } from '@/lib/db-auto-migrate';
import PortalLogin from './PortalLogin';
import PortalClient from './PortalClient';
import './portal.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employee Portal | My Pain Clinic Global',
  description: 'Self-service portal for attendance, leaves, shift timings, and official salary slips.',
};

export const dynamic = 'force-dynamic';

export default async function PortalPage(props: {
  searchParams?: Promise<{ month?: string; year?: string; tab?: string }> | { month?: string; year?: string; tab?: string };
}) {
  await ensureDatabaseSchemaSynced();
  const session = await getPortalSession();

  if (!session) {
    return <PortalLogin />;
  }

  const rawParams = await props.searchParams;
  const targetMonth = rawParams?.month ? parseInt(rawParams.month, 10) : undefined;
  const targetYear = rawParams?.year ? parseInt(rawParams.year, 10) : undefined;
  const validTabs = ['attendance', 'leaves', 'slips', 'notices'] as const;
  const initialTab =
    rawParams?.tab && (validTabs as readonly string[]).includes(rawParams.tab)
      ? (rawParams.tab as (typeof validTabs)[number])
      : undefined;

  const data = await getPortalDashboardData(targetMonth, targetYear);

  if (!data.authenticated) {
    return <PortalLogin />;
  }

  return (
    <PortalClient
      initialEmployee={data.employee}
      initialSummary={data.summary}
      initialAttendance={data.attendanceList}
      initialLeaves={data.leaves}
      initialShiftOverrides={data.shiftOverrides}
      initialSalarySlips={data.salarySlips}
      initialNotices={data.notices}
      initialWarnings={data.warnings}
      initialTab={initialTab}
    />
  );
}
