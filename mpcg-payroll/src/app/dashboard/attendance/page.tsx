import { getDailyAttendance } from '@/actions/attendance';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AttendanceFilters from './AttendanceFilters';
import { timeHHMMToMinutes, minutesToTimeHHMM, minutesToDecimalHours } from '@/lib/currency-utils';

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

  // Sandwich Leave Detection
  // Build a map: employeeId -> dateStr -> status
  const SANDWICH_LEAVE_STATUSES = new Set(['ABSENT', 'UNPAID_LEAVE']);
  const empDateStatusMap = new Map<string, Map<string, string>>();
  for (const rec of attendance) {
    const empId = (rec as any).employeeId as string;
    const dateStr = (rec as any).date.toISOString().split('T')[0];
    if (!empDateStatusMap.has(empId)) empDateStatusMap.set(empId, new Map());
    empDateStatusMap.get(empId)!.set(dateStr, (rec as any).status);
  }

  // Build a Set of record IDs that are sandwiched weekly-offs
  const sandwichedRecordIds = new Set<string>();
  for (const rec of attendance) {
    if ((rec as any).status !== 'WEEKLY_OFF') continue;
    const empId = (rec as any).employeeId as string;
    const date = new Date((rec as any).date);
    const prevDate = new Date(date); prevDate.setUTCDate(date.getUTCDate() - 1);
    const nextDate = new Date(date); nextDate.setUTCDate(date.getUTCDate() + 1);
    const prevKey = prevDate.toISOString().split('T')[0];
    const nextKey = nextDate.toISOString().split('T')[0];
    const empMap = empDateStatusMap.get(empId);
    const prevStatus = empMap?.get(prevKey);
    const nextStatus = empMap?.get(nextKey);
    if (prevStatus && nextStatus && SANDWICH_LEAVE_STATUSES.has(prevStatus) && SANDWICH_LEAVE_STATUSES.has(nextStatus)) {
      sandwichedRecordIds.add((rec as any).id);
    }
  }

  const sandwichedCount = sandwichedRecordIds.size;

  const activeMonth = attendance.length > 0 ? attendance[0].date.getUTCMonth() + 1 : undefined;
  const activeYear = attendance.length > 0 ? attendance[0].date.getUTCFullYear() : undefined;

  // Full Present Days (proper punch in and punch out)
  const fullPresentAttendance = attendance.filter((rec: any) => 
    rec.status === 'PRESENT' || rec.status === 'WORK_FROM_HOME' || rec.status === 'ON_DUTY'
  );
  const totalFullHoursWorked = Math.round(fullPresentAttendance.reduce((sum: number, rec: any) => {
    return sum + Number(rec.workingHours || 0);
  }, 0) * 100) / 100;

  // Half Day Days & Hours
  const halfDayAttendance = attendance.filter((rec: any) => rec.status === 'HALF_DAY');
  const halfDayCount = halfDayAttendance.length;
  const totalHalfDayHours = Math.round(halfDayAttendance.reduce((sum: number, rec: any) => {
    return sum + Number(rec.workingHours || 0);
  }, 0) * 100) / 100;

  // Missing Punches Count
  const missingPunchCount = attendance.filter((rec: any) => rec.status === 'MISSING_PUNCH').length;

  // Total Combined Hours Worked
  const totalHoursWorked = Math.round((totalFullHoursWorked + totalHalfDayHours) * 100) / 100;

  const presentCount = fullPresentAttendance.length;
  const totalPresentDaysCount = presentCount + (halfDayCount > 0 ? halfDayCount * 0.5 : 0);
  const avgWorkingHours = totalPresentDaysCount > 0 
    ? (totalHoursWorked / totalPresentDaysCount).toFixed(2) 
    : '0.00';

  // Get standard working hours (use the employee's setting if filtering by single employee)
  const standardHours = employeeId && attendance.length > 0 
    ? Number((attendance[0] as any).employee?.standardWorkingHours || 9) 
    : 9;
  
  // Expected hours is calculated ONLY for full proper present days * shift hours from profile (excluding half days)
  const expectedHours = presentCount * standardHours; // e.g., 19 × 9 = 171
  
  // Overtime calculation: convert daily HH.MM overtime to total minutes first, then to decimal hours
  const totalOvertimeMins = attendance.reduce((sum: number, rec: any) => {
    return sum + timeHHMMToMinutes(Number(rec.overtimeHours || 0));
  }, 0);
  const rawOvertime = minutesToDecimalHours(totalOvertimeMins);
  const totalOvertime = totalFullHoursWorked < expectedHours ? 0 : rawOvertime;

  // Short Working Hours = Expected Hours (full present days * shift hours) - Full Present Hours Worked
  const lateMark = Math.max(0, Math.round((expectedHours - totalFullHoursWorked) * 100) / 100);
  const lateMarkFormatted = lateMark.toFixed(2);

  // Format HH.MM value for display
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem', gap: '1rem' }}>
        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Full Present Hours
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4', marginTop: '0.25rem' }}>
            {formatWorkingHours(totalFullHoursWorked)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            Proper Punch In/Out ({presentCount} days)
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Average Working Hours
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0891b2', marginTop: '0.25rem' }}>
            {avgWorkingHours}h / day
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            {formatWorkingHours(totalHoursWorked)} ÷ {presentCount || 1} present days
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Half Day Hours
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.25rem' }}>
            {formatWorkingHours(totalHalfDayHours)}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            {halfDayCount} half day records
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Missing Punches
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: missingPunchCount > 0 ? '#f43f5e' : '#10b981', marginTop: '0.25rem' }}>
            {missingPunchCount}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            {missingPunchCount === 1 ? '1 record missing punch' : `${missingPunchCount} records missing punch`}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Expected Hours
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6', marginTop: '0.25rem' }}>
            {expectedHours}h
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            {presentCount} full days × {standardHours}h
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Short Working Hours
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: lateMark > 0 ? '#ef4444' : '#10b981', marginTop: '0.25rem' }}>
            {lateMarkFormatted}h
          </div>
          {lateMark > 0 && (
            <div className="text-xs" style={{ color: '#ef4444', marginTop: '0.15rem' }}>
              {expectedHours}h - {formatWorkingHours(totalFullHoursWorked)}
            </div>
          )}
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Overtime
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>
            {formatWorkingHours(totalOvertime)}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Present Records
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.25rem' }}>
            {presentCount}{halfDayCount > 0 ? ` + ${halfDayCount} half` : ''}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Records
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1', marginTop: '0.25rem' }}>
            {attendance.length}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem', border: sandwichedCount > 0 ? '1px solid #7c3aed' : undefined }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🥪 Sandwich LOP
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: sandwichedCount > 0 ? '#7c3aed' : '#10b981', marginTop: '0.25rem' }}>
            {sandwichedCount}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.15rem' }}>
            {sandwichedCount === 1 ? '1 weekly-off counted as LOP' : `${sandwichedCount} weekly-offs counted as LOP`}
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                      <span className={`badge ${sandwichedRecordIds.has(rec.id) ? 'badge-absent' : (statusBadgeMap[rec.status] || 'badge-draft')}`}>
                        {rec.status.replace(/_/g, ' ')}
                      </span>
                      {sandwichedRecordIds.has(rec.id) && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '4px',
                            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
                            color: '#fff',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                          title="This weekly off is sandwiched between two leave days (Saturday and Monday) and counts as LOP"
                        >
                          🥪 Sandwich LOP
                        </span>
                      )}
                    </div>
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
