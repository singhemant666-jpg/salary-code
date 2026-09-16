import { prisma } from '@/lib/prisma';
import { getShiftOverrides } from '@/actions/shift-overrides';
import ShiftOverrideModal from './ShiftOverrideModal';
import ShiftDeleteButton from './ShiftDeleteButton';
import Link from 'next/link';
import { Clock, Calendar, Users, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ShiftOverridesPage() {
  const overrides = await getShiftOverrides();

  const employees = await prisma.employee.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, employeeId: true, department: true },
    orderBy: { name: 'asc' },
  });

  const uniqueEmployees = new Set(overrides.map((o: any) => o.employeeId)).size;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header & Main Action */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Clock size={24} style={{ color: '#818cf8' }} />
            Shift Timing Management & Roster
          </h1>
          <p className="page-subtitle">Set date-wise custom shift timings for doctors & employees to manage custom schedules & prevent late penalty marks</p>
        </div>
        <ShiftOverrideModal employees={employees} />
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem' }}>
        <Link href="/dashboard/attendance" className="btn btn-sm btn-ghost" style={{ fontSize: '0.85rem' }}>
          📅 Daily Attendance Log
        </Link>
        <Link href="/dashboard/attendance/leaves" className="btn btn-sm btn-ghost" style={{ fontSize: '0.85rem' }}>
          📄 Leave Applications
        </Link>
        <Link href="/dashboard/attendance/shifts" className="btn btn-sm btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
          ⏰ Shift Timing Overrides ({overrides.length})
        </Link>
      </div>

      {/* KPI Stats Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* Stat 1: Total Overrides */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', display: 'flex' }}>
            <Clock size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Total Shift Overrides
            </span>
            <strong style={{ fontSize: '1.4rem', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.2 }}>
              {overrides.length}
            </strong>
          </div>
        </div>

        {/* Stat 2: Employees Managed */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3.5px solid #06b6d4' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee', display: 'flex' }}>
            <Users size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Employees Affected
            </span>
            <strong style={{ fontSize: '1.4rem', color: '#06b6d4', fontWeight: 800, lineHeight: 1.2 }}>
              {uniqueEmployees}
            </strong>
          </div>
        </div>

        {/* Stat 3: Late Penalty Protection */}
        <div className="glass-card-static" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3.5px solid #22c55e' }}>
          <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', display: 'flex' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, display: 'block' }}>
              Late Mark Protection
            </span>
            <strong style={{ fontSize: '1rem', color: '#22c55e', fontWeight: 700, lineHeight: 1.2 }}>
              Active & Synced
            </strong>
          </div>
        </div>
      </div>

      {/* Main Shift Overrides Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee / Doctor</th>
              <th>ID</th>
              <th>From Date</th>
              <th>To Date</th>
              <th>Custom Shift Timing</th>
              <th>Reason / Note</th>
              <th>Created By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {overrides.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted" style={{ padding: '3.5rem 1rem' }}>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    No Custom Shift Timing Overrides Configured
                  </div>
                  <p style={{ fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.25rem', color: 'var(--text-secondary)' }}>
                    If you need to change a doctor or employee&apos;s shift timing for specific dates (e.g. 12:00 PM to 09:00 PM instead of 09:00 AM), click &quot;Add Shift Override&quot;.
                  </p>
                  <ShiftOverrideModal employees={employees} />
                </td>
              </tr>
            ) : (
              overrides.map((override: any) => {
                const fromDateObj = new Date(override.fromDate);
                const toDateObj = new Date(override.toDate);
                const fromStr = fromDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
                const toStr = toDateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

                return (
                  <tr key={override.id}>
                    <td style={{ fontWeight: 500 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{override.employee.name}</div>
                      {override.employee.department && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{override.employee.department}</div>
                      )}
                    </td>
                    <td className="font-mono text-muted text-sm">{override.employee.employeeId}</td>
                    <td className="text-sm font-mono">{fromStr}</td>
                    <td className="text-sm font-mono">{toStr}</td>
                    <td>
                      <span className="badge badge-info" style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        ⏰ {override.shiftStartTime} – {override.shiftEndTime}
                      </span>
                    </td>
                    <td className="text-sm text-secondary" style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {override.reason || '—'}
                    </td>
                    <td className="text-sm text-muted">
                      {override.createdBy || 'HR Admin'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <ShiftDeleteButton id={override.id} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
