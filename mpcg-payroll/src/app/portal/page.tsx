import { getPortalSession } from '@/actions/portal-auth';
import { getPortalDashboardData } from '@/actions/portal-data';
import PortalLogin from './PortalLogin';
import PortalClient from './PortalClient';
import './portal.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employee Portal | My Pain Clinic Global',
  description: 'Self-service portal for attendance, leaves, shift timings, and official salary slips.',
};

export const dynamic = 'force-dynamic';

export default async function PortalPage() {
  const session = await getPortalSession();

  if (!session) {
    return <PortalLogin />;
  }

  const data = await getPortalDashboardData();

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
    />
  );
}
