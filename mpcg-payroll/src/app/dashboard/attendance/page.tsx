import { getDailyAttendance } from '@/actions/attendance';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AttendanceFilters from './AttendanceFilters';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const month = params.month ? parseInt(params.month) : undefined;
  const year = params.year ? parseInt(params.year) : undefined;
  const date = params.date || '';
  const employeeId = params.employeeId || undefined;

  const attendance = await getDailyAttendance({
    ...(date ? { date } : (month && year ? { month, year } : {})),
    ...(employeeId ? { employeeId } : {}),
  });

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, employeeId: true },
    orderBy: { name: 'asc' },
  });

  // Group by date for display
  const dateGroups = new Map<string, typeof attendance>();
  for (const record of attendance) {
    const dateStr = record.date.toISOString().split('T')[0];
    if (!dateGroups.has(dateStr)) dateGroups.set(dateStr, []);
    dateGroups.get(dateStr)!.push(record);
  }

  const statusBadgeMap: Record<string, string> = {
    PRESENT: 'badge-present',
    ABSENT: 'badge-absent',
    HALF_DAY: 'badge-halfday',
    PAID_LEAVE: 'badge-leave',
    UNPAID_LEAVE: 'badge-leave',
    WEEKLY_OFF: 'badge-weeklyoff',
    HOLIDAY: 'badge-holiday',
    WORK_FROM_HOME: 'badge-present',
    ON_DUTY: 'badge-present',
    MISSING_PUNCH: 'badge-missing',
  };

  const activeMonth = attendance.length > 0 ? attendance[0].date.getUTCMonth() + 1 : undefined;
  const activeYear = attendance.length > 0 ? attendance[0].date.getUTCFullYear() : undefined;

  // Convert HH.MM display value to total minutes (e.g. 9.14 = 9h14m = 554 minutes)
  const hhmmToMinutes = (v: number) => {
    const h = Math.floor(v);
    const m = Math.round((v - h) * 100);
    return h * 60 + m;
  };

  // Sum total minutes worked across all days
  const totalMinutesWorked = attendance.reduce((sum: number, rec: any) => sum + hhmmToMinutes(Number(rec.workingHours || 0)), 0);
  const totalMinutesOT = attendance.reduce((sum: number, rec: any) => sum + hhmmToMinutes(Number(rec.overtimeHours || 0)), 0);
  const presentCount = attendance.filter((rec: any) => rec.status === 'PRESENT').length;

  // Format total as decimal hours (e.g. 13712 mins = 228.53h)
  const totalHoursWorked = parseFloat((totalMinutesWorked / 60).toFixed(2));
  const totalOvertime = parseFloat((totalMinutesOT / 60).toFixed(2));

  // Format total as "Xh Ym" for clarity (e.g. 13712 mins = "228h 32m")
  const formatTotalHHMM = (totalMins: number) => {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return `${h}h ${m}m`;
  };

  // Per-day display stays in HH.MM format (e.g. 9.14h = 9 hours 14 minutes)
  const formatWorkingHours = (hoursVal: number | null | undefined) => {
    const val = Number(hoursVal || 0);
    if (val <= 0) return '0.00h';
    return `${val.toFixed(2)}h`;
  };

  const formatTimeString = (timeStr: string | null) => {
    if (!timeStr || !timeStr.includes(':')) return '—';
    const parts = timeStr.split(':').map(Number);
    const h = parts[0];
    const m = parts[1];
    if (isNaN(h) || isNaN(m)) return '—';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${String(formattedH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Attendance</h1>
          <p className="page-subtitle">{attendance.length} records found</p>
        </div>
        <Link href="/dashboard/attendance/import" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Import Attendance
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '1.5rem', gap: '1rem' }}>
        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Hours Worked
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4', marginTop: '0.25rem' }}>
            {totalHoursWorked.toFixed(2)}h
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            ({formatTotalHHMM(totalMinutesWorked)})
          </div>
        </div>
        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Overtime
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>
            {totalOvertime.toFixed(2)}h
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            ({formatTotalHHMM(totalMinutesOT)})
          </div>
        </div>
        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Present Records
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.25rem' }}>
            {presentCount}
          </div>
        </div>
        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Records
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.25rem' }}>
            {attendance.length}
          </div>
        </div>
      </div>

      <AttendanceFilters employees={employees} defaultMonth={activeMonth} defaultYear={activeYear} />

      <div className="table-container" style={{ marginTop: '1rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Employee</th>
              <th>ID</th>
              <th>First IN</th>
              <th>Last OUT</th>
              <th>Hours Worked</th>
              <th>Required Shift</th>
              <th>Late</th>
              <th>OT</th>
              <th>Status</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No attendance records found. Import attendance data to get started.
                </td>
              </tr>
            ) : (
              attendance.map((rec: any) => (
                <tr key={rec.id}>
                  <td className="font-mono text-sm">
                    {rec.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })}
                  </td>
                  <td style={{ fontWeight: 500 }}>{rec.employee.name}</td>
                  <td className="font-mono text-muted text-sm">{rec.employee.employeeId}</td>
                  <td className="font-mono text-sm" style={{ color: '#22c55e', fontWeight: 500 }}>
                    {formatTimeString(rec.firstIn)}
                  </td>
                  <td className="font-mono text-sm" style={{ color: '#ef4444', fontWeight: 500 }}>
                    {formatTimeString(rec.lastOut)}
                  </td>
                  <td className="font-mono text-sm" style={{ fontWeight: 600 }}>{formatWorkingHours(rec.workingHours)}</td>
                  <td className="font-mono text-sm text-muted">{Number(rec.employee.standardWorkingHours || 8).toFixed(1)}h</td>
                  <td className="text-sm" style={{ color: rec.lateMinutes > 0 ? '#f59e0b' : '#64748b' }}>
                    {rec.lateMinutes > 0 ? `${rec.lateMinutes}m` : '—'}
                  </td>
                  <td className="text-sm font-mono" style={{ color: Number(rec.overtimeHours) > 0 ? '#06b6d4' : '#64748b' }}>
                    {Number(rec.overtimeHours) > 0 ? formatWorkingHours(rec.overtimeHours) : '—'}
                  </td>
                  <td>
                    <span className={`badge ${statusBadgeMap[rec.status] || 'badge-draft'}`}>
                      {rec.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-sm text-muted" style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {rec.remarks || '—'}
                    {rec.isManuallyEdited && (
                      <span style={{ color: '#f59e0b', marginLeft: '0.25rem' }} title={`Edited by ${rec.editedBy}: ${rec.editReason}`}>
                        ✎
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
