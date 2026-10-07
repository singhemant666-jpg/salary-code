import { getDailyAttendance } from '@/actions/attendance';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import AttendanceFilters from './AttendanceFilters';
import { 
  timeHHMMToMinutes, 
  minutesToTimeHHMM, 
  minutesToDecimalHours,
  minutesToHHMMString,
  minutesToReadableString,
  hhmmToHHMMString,
  hhmmToReadableString
} from '@/lib/currency-utils';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const month = params.month ? parseInt(params.month) : (params.year ? currentMonth : undefined);
  const year = params.year ? parseInt(params.year) : (params.month ? currentYear : undefined);
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

  const activeMonth = month || (attendance.length > 0 ? attendance[0].date.getUTCMonth() + 1 : currentMonth);
  const activeYear = year || (attendance.length > 0 ? attendance[0].date.getUTCFullYear() : currentYear);

  // Fetch shift overrides for active month/date range
  const filterStartDate = new Date(Date.UTC(activeYear, activeMonth - 1, 1, 0, 0, 0));
  const filterEndDate = new Date(Date.UTC(activeYear, activeMonth, 0, 23, 59, 59));

  let rawOverrides: any[] = [];
  try {
    if ((prisma as any).shiftOverride?.findMany) {
      rawOverrides = await (prisma as any).shiftOverride.findMany({
        where: {
          fromDate: { lte: filterEndDate },
          toDate: { gte: filterStartDate },
        }
      });
    } else {
      rawOverrides = await prisma.$queryRaw`
        SELECT * FROM shift_overrides
        WHERE fromDate <= ${filterEndDate} AND toDate >= ${filterStartDate}
      `;
    }
  } catch (e) {
    try {
      rawOverrides = await prisma.$queryRaw`SELECT * FROM shift_overrides`;
    } catch (err) {}
  }

  // Build shiftOverrideMap: key = employeeId_dateStr -> override object
  const shiftOverrideMap = new Map<string, { shiftStartTime: string; shiftEndTime: string; reason?: string }>();
  for (const ov of rawOverrides) {
    const fromStr = new Date(Math.max(new Date(ov.fromDate).getTime(), filterStartDate.getTime())).toISOString().split('T')[0];
    const toStr = new Date(Math.min(new Date(ov.toDate).getTime(), filterEndDate.getTime())).toISOString().split('T')[0];
    const from = new Date(`${fromStr}T00:00:00.000Z`);
    const to = new Date(`${toStr}T00:00:00.000Z`);

    for (let d = new Date(from); d <= to; d.setUTCDate(d.getUTCDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      const dataObj = {
        shiftStartTime: ov.shiftStartTime,
        shiftEndTime: ov.shiftEndTime,
        reason: ov.reason || undefined,
      };
      shiftOverrideMap.set(`${ov.employeeId}_${dStr}`, dataObj);
    }
  }

  // Fetch approved leaves from Leave Management for the active period
  let approvedLeaveCount = 0;
  try {
    approvedLeaveCount = await prisma.leave.count({
      where: {
        status: 'APPROVED',
        fromDate: { lte: filterEndDate },
        toDate: { gte: filterStartDate },
        ...(employeeId ? { employeeId } : {}),
      },
    });
  } catch (err) {}

  // Full Present Days (proper punch in and punch out)
  const fullPresentAttendance = attendance.filter((rec: any) => 
    rec.status === 'PRESENT' || rec.status === 'WORK_FROM_HOME' || rec.status === 'ON_DUTY'
  );
  // FIX: Convert HH.MM to minutes first, then sum (correct base-60 math)
  const totalFullWorkingMinutes = fullPresentAttendance.reduce((sum: number, rec: any) => {
    return sum + timeHHMMToMinutes(Number(rec.workingHours || 0));
  }, 0);

  // Half Day Days & Hours
  const halfDayAttendance = attendance.filter((rec: any) => rec.status === 'HALF_DAY');
  const halfDayCount = halfDayAttendance.length;
  const totalHalfDayMinutes = halfDayAttendance.reduce((sum: number, rec: any) => {
    return sum + timeHHMMToMinutes(Number(rec.workingHours || 0));
  }, 0);

  // Missing Punches Count
  const missingPunchCount = attendance.filter((rec: any) => rec.status === 'MISSING_PUNCH').length;

  // Leave & Absence counts from attendance records
  const paidLeaveCount = attendance.filter((rec: any) => rec.status === 'PAID_LEAVE').length;
  const unpaidLeaveCount = attendance.filter((rec: any) => rec.status === 'UNPAID_LEAVE').length;
  const absentCount = attendance.filter((rec: any) => rec.status === 'ABSENT').length;
  const totalLeaveDaysCount = paidLeaveCount + unpaidLeaveCount + absentCount;

  // Weekly Offs & Holidays
  const weeklyOffCount = attendance.filter((rec: any) => rec.status === 'WEEKLY_OFF').length;
  const holidayCount = attendance.filter((rec: any) => rec.status === 'HOLIDAY').length;

  // Total Combined Working Minutes
  const totalWorkingMinutes = totalFullWorkingMinutes + totalHalfDayMinutes;

  const presentCount = fullPresentAttendance.length;
  const totalPresentDaysCount = presentCount + (halfDayCount > 0 ? halfDayCount * 0.5 : 0);

  // Average working minutes per day
  const avgWorkingMinutes = totalPresentDaysCount > 0 
    ? Math.round(totalWorkingMinutes / totalPresentDaysCount) 
    : 0;

  // Get standard working hours (use the employee's setting if filtering by single employee)
  const standardHours = employeeId && attendance.length > 0 
    ? Number((attendance[0] as any).employee?.standardWorkingHours || 9) 
    : 9;
  
  // Expected minutes is calculated ONLY for full proper present days * shift hours from profile (excluding half days)
  const expectedMinutes = presentCount * standardHours * 60; // e.g., 20 × 9 × 60 = 10,800 mins
  
  // Overtime calculation: Total Full Minutes - Expected Minutes (if > 0)
  const overtimeMinutes = Math.max(0, totalFullWorkingMinutes - expectedMinutes);

  // Short Working Hours: Expected Minutes - Total Full Working Minutes (if > 0)
  const shortWorkingMinutes = Math.max(0, expectedMinutes - totalFullWorkingMinutes);

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
          <h1 className="page-title">Daily Attendance Log</h1>
          <p className="page-subtitle">{attendance.length} records found</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link href="/dashboard/attendance/shifts" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            ⏰ Shift Overrides
          </Link>
          <Link href="/dashboard/attendance/leaves" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            📄 Leave Management
          </Link>
          <Link href="/dashboard/attendance/import" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Import Attendance
          </Link>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: '1.5rem', gap: '1rem' }}>
        <div className="stat-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Full Present Hours
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#06b6d4', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
              {totalFullWorkingMinutes.toLocaleString()} total mins
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#06b6d4', marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span>{minutesToHHMMString(totalFullWorkingMinutes)}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              ({minutesToReadableString(totalFullWorkingMinutes)})
            </span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.25rem' }}>
            <span>Proper Punch In/Out ({presentCount} days)</span>
            <span style={{ color: '#06b6d4', fontWeight: 600 }}>{totalFullWorkingMinutes.toLocaleString()} mins</span>
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Average Working Hours
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0891b2', background: 'rgba(8, 145, 178, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
              {avgWorkingMinutes.toLocaleString()} mins/day
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0891b2', marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span>{minutesToHHMMString(avgWorkingMinutes)}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              / day ({minutesToReadableString(avgWorkingMinutes)})
            </span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {minutesToHHMMString(totalWorkingMinutes)} ({totalWorkingMinutes.toLocaleString()} mins) ÷ {presentCount || 1} present days
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Half Day Hours
            </span>
            {totalHalfDayMinutes > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                {totalHalfDayMinutes.toLocaleString()} mins
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b', marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span>{minutesToHHMMString(totalHalfDayMinutes)}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              ({minutesToReadableString(totalHalfDayMinutes)})
            </span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {halfDayCount} half day records {totalHalfDayMinutes > 0 ? `(${totalHalfDayMinutes.toLocaleString()} mins)` : ''}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Missing Punches
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: missingPunchCount > 0 ? '#f43f5e' : '#10b981', marginTop: '0.25rem' }}>
            {missingPunchCount}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {missingPunchCount === 1 ? '1 record missing punch' : `${missingPunchCount} records missing punch`}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Expected Hours
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
              {expectedMinutes.toLocaleString()} total mins
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#8b5cf6', marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span>{minutesToHHMMString(expectedMinutes)}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              ({minutesToReadableString(expectedMinutes)})
            </span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {presentCount} full days × {standardHours}h = {expectedMinutes.toLocaleString()} mins
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Short Working Hours
            </span>
            {shortWorkingMinutes > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', background: 'rgba(239, 68, 68, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                {shortWorkingMinutes.toLocaleString()} mins short
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: shortWorkingMinutes > 0 ? '#ef4444' : '#10b981', marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span>{minutesToHHMMString(shortWorkingMinutes)}</span>
            {shortWorkingMinutes > 0 && (
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#ef4444' }}>
                ({minutesToReadableString(shortWorkingMinutes)})
              </span>
            )}
          </div>
          {shortWorkingMinutes > 0 ? (
            <div className="text-xs" style={{ color: '#ef4444', marginTop: '0.2rem' }}>
              {minutesToHHMMString(expectedMinutes)} - {minutesToHHMMString(totalFullWorkingMinutes)} ({shortWorkingMinutes.toLocaleString()} mins short)
            </div>
          ) : (
            <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
              Full shift hours completed
            </div>
          )}
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Overtime
            </span>
            {overtimeMinutes > 0 && (
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
                {overtimeMinutes.toLocaleString()} mins OT
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.35rem' }}>
            <span>{minutesToHHMMString(overtimeMinutes)}</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#10b981', opacity: 0.85 }}>
              ({minutesToReadableString(overtimeMinutes)})
            </span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {overtimeMinutes > 0 ? `${overtimeMinutes.toLocaleString()} mins overtime worked` : 'No overtime hours'}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Present Records
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#3b82f6', marginTop: '0.25rem' }}>
            {presentCount}{halfDayCount > 0 ? ` + ${halfDayCount} half` : ''}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {presentCount} full days{halfDayCount > 0 ? ` • ${halfDayCount} half days` : ''}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem', border: totalLeaveDaysCount > 0 ? '1px solid rgba(244, 63, 94, 0.35)' : undefined }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Leaves & Absent
            </span>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              color: (unpaidLeaveCount + absentCount > 0) ? '#f43f5e' : (paidLeaveCount > 0 ? '#38bdf8' : '#10b981'), 
              background: (unpaidLeaveCount + absentCount > 0) ? 'rgba(244, 63, 94, 0.15)' : (paidLeaveCount > 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)'), 
              padding: '2px 8px', 
              borderRadius: '4px' 
            }}>
              {unpaidLeaveCount + absentCount > 0 ? `${unpaidLeaveCount + absentCount} LOP` : (paidLeaveCount > 0 ? `${paidLeaveCount} Paid` : '0 Leave')}
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: totalLeaveDaysCount > 0 ? '#f43f5e' : '#10b981', marginTop: '0.25rem' }}>
            {totalLeaveDaysCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{totalLeaveDaysCount === 1 ? 'day' : 'days'}</span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {totalLeaveDaysCount > 0 
              ? `${paidLeaveCount} Paid • ${unpaidLeaveCount} Unpaid • ${absentCount} Absent`
              : 'No leaves or absences'}
            {approvedLeaveCount > 0 ? ` (${approvedLeaveCount} in Leave Mgmt)` : ''}
          </div>
        </div>

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Weekly Off & Holidays
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a855f7', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '4px' }}>
              {weeklyOffCount + holidayCount} off
            </span>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#a855f7', marginTop: '0.25rem' }}>
            {weeklyOffCount + holidayCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)' }}>days</span>
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {weeklyOffCount} weekly off{weeklyOffCount !== 1 ? 's' : ''} • {holidayCount} holiday{holidayCount !== 1 ? 's' : ''}
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

        <div className="stat-card" style={{ padding: '1rem' }}>
          <div className="text-xs text-muted" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Records
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#6366f1', marginTop: '0.25rem' }}>
            {attendance.length}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
            {presentCount} present + {missingPunchCount} missing + {totalLeaveDaysCount} leave + {weeklyOffCount + holidayCount} off
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
              <th>Shift Timing</th>
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
              attendance.map((rec: any) => {
                const empDbId = rec.employeeId || rec.employee?.id;
                const empCode = rec.employee?.employeeId;
                const dateStr = rec.date.toISOString().split('T')[0];
                const overrideInfo = shiftOverrideMap.get(`${empDbId}_${dateStr}`) || (empCode ? shiftOverrideMap.get(`${empCode}_${dateStr}`) : undefined);

                return (
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
                    <td className="font-mono text-sm" style={{ fontWeight: 600 }}>
                      {rec.workingHours ? (
                        <span>
                          {hhmmToHHMMString(rec.workingHours)}
                          <span className="text-xs text-muted" style={{ marginLeft: '4px', fontWeight: 400 }}>
                            ({hhmmToReadableString(rec.workingHours)} • {timeHHMMToMinutes(Number(rec.workingHours))}m)
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted">00:00 (0m)</span>
                      )}
                    </td>
                    <td className="text-sm">
                      {overrideInfo ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                          <span className="font-mono" style={{ fontWeight: 700, color: '#c084fc', whiteSpace: 'nowrap' }}>
                            ⏰ {formatTimeString(overrideInfo.shiftStartTime)} - {formatTimeString(overrideInfo.shiftEndTime)}
                          </span>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '4px',
                              background: 'linear-gradient(135deg, #9333ea, #06b6d4)',
                              color: '#fff',
                              letterSpacing: '0.03em',
                              width: 'fit-content',
                              whiteSpace: 'nowrap',
                            }}
                            title={overrideInfo.reason ? `Shift Override: ${overrideInfo.reason}` : 'Custom Date-Wise Shift Timing Override'}
                          >
                            Shift Override
                          </span>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="font-mono text-muted text-xs">
                            {formatTimeString(rec.employee?.shiftStartTime || '09:00')} - {formatTimeString(rec.employee?.shiftEndTime || '18:00')}
                          </span>
                          <span className="font-mono text-xs text-muted" style={{ opacity: 0.7 }}>
                            ({Number(rec.employee?.standardWorkingHours || 9).toFixed(1)}h)
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="text-sm font-mono">
                      {rec.lateMinutes > 0 ? (
                        rec.lateMinutes > Number(rec.employee?.lateThresholdMinutes || 15) ? (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            {rec.lateMinutes}m <span className="text-xs" style={{ color: '#f87171' }}>late</span>
                          </span>
                        ) : (
                          <span style={{ color: '#64748b' }} title={`Within ${rec.employee?.lateThresholdMinutes || 15}m grace window`}>
                            {rec.lateMinutes}m <span className="text-xs text-muted">(grace)</span>
                          </span>
                        )
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-sm font-mono" style={{ color: Number(rec.overtimeHours) > 0 ? '#06b6d4' : '#64748b' }}>
                      {Number(rec.overtimeHours) > 0 ? (
                        <span>
                          {hhmmToHHMMString(rec.overtimeHours)}
                          <span className="text-xs" style={{ marginLeft: '4px', opacity: 0.8 }}>
                            ({hhmmToReadableString(rec.overtimeHours)} • {timeHHMMToMinutes(Number(rec.overtimeHours))}m)
                          </span>
                        </span>
                      ) : '—'}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
