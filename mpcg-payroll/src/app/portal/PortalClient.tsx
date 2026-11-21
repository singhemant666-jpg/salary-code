'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  PortalAttendanceDay,
  PortalAttendanceSummary,
  PortalSalarySlipItem,
  getPortalDashboardData,
  submitPortalLeave,
  cancelPortalLeave,
  syncPortalRealtimeCloud,
} from '@/actions/portal-data';
import { logoutPortal, PortalSessionEmployee } from '@/actions/portal-auth';
import { BroadcastNotice, EmployeeWarning } from '@/actions/portal-notices';
import {
  Calendar,
  FileText,
  User,
  LogOut,
  Bell,
  PlusCircle,
  Download,
  CalendarCheck,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  X,
  XCircle,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { MpcgBrandMark } from '@/components/brand/MpcgLogo';
import './portal.css';

interface PortalClientProps {
  initialEmployee: PortalSessionEmployee;
  initialSummary: PortalAttendanceSummary;
  initialAttendance: PortalAttendanceDay[];
  initialLeaves: any[];
  initialShiftOverrides: any[];
  initialSalarySlips: PortalSalarySlipItem[];
  initialNotices: BroadcastNotice[];
  initialWarnings: EmployeeWarning[];
  initialTab?: 'attendance' | 'leaves' | 'slips' | 'notices';
}

function formatPunchTimeString(timeStr: string | null): string {
  if (!timeStr || !timeStr.includes(':')) return '';
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedH = h % 12 || 12;
  return `${String(formattedH).padStart(2, '0')}:${m} ${ampm}`;
}

function formatTimeTo12h(timeStr: string): string {
  if (!timeStr || !timeStr.includes(':')) return timeStr;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedH = h % 12 || 12;
  return `${formattedH}:${m} ${ampm}`;
}

function calculateHoursDiff(start: string, end: string): string | null {
  if (!start || !end || !start.includes(':') || !end.includes(':')) return null;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return null;
  let diffMins = (eh * 60 + em) - (sh * 60 + sm);
  if (diffMins <= 0) diffMins += 24 * 60;
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h} hrs`;
  return `${m} mins`;
}

const CLINIC_TIME_OPTIONS = [
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '18:30', label: '06:30 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '20:30', label: '08:30 PM' },
  { value: '21:00', label: '09:00 PM' },
];

function formatPunchTime(timeStr: string | null) {
  if (!timeStr || !timeStr.includes(':')) {
    return <span style={{ color: '#94a3b8' }}>--:--</span>;
  }
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parts[1];
  if (isNaN(h)) {
    return <span>{timeStr}</span>;
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedH = h % 12 || 12;
  const timeFormatted = `${String(formattedH).padStart(2, '0')}:${m}`;
  return (
    <span style={{ whiteSpace: 'nowrap' }}>
      {timeFormatted}
      <span style={{ fontSize: '0.62rem', fontWeight: 600, color: '#64748b', marginLeft: '2px' }}>
        {ampm}
      </span>
    </span>
  );
}

export default function PortalClient({
  initialEmployee,
  initialSummary,
  initialAttendance,
  initialLeaves,
  initialShiftOverrides,
  initialSalarySlips,
  initialNotices,
  initialWarnings,
  initialTab,
}: PortalClientProps) {
  const [activeTab, setActiveTabState] = useState<'attendance' | 'leaves' | 'slips' | 'notices'>(
    initialTab || 'attendance'
  );
  const [employee] = useState<PortalSessionEmployee>(initialEmployee);
  const [summary, setSummary] = useState<PortalAttendanceSummary>(initialSummary);
  const [attendance, setAttendance] = useState<PortalAttendanceDay[]>(() =>
    [...initialAttendance].sort((a, b) => b.dayNumber - a.dayNumber)
  );
  const [leaves, setLeaves] = useState<any[]>(initialLeaves);
  const [shiftOverrides, setShiftOverrides] = useState<any[]>(initialShiftOverrides);
  const [salarySlips, setSalarySlips] = useState<PortalSalarySlipItem[]>(initialSalarySlips);
  const [notices] = useState<BroadcastNotice[]>(initialNotices);
  const [warnings] = useState<EmployeeWarning[]>(initialWarnings);

  // Restore and maintain active tab across page refreshes
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      const validTabs = ['attendance', 'leaves', 'slips', 'notices'] as const;

      if (urlTab && (validTabs as readonly string[]).includes(urlTab)) {
        setActiveTabState(urlTab as any);
        localStorage.setItem('mpcg_portal_active_tab', urlTab);
        return;
      }

      const savedTab = localStorage.getItem('mpcg_portal_active_tab');
      if (savedTab && (validTabs as readonly string[]).includes(savedTab)) {
        setActiveTabState(savedTab as any);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', savedTab);
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}
  }, []);

  const handleTabChange = (tab: 'attendance' | 'leaves' | 'slips' | 'notices') => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('mpcg_portal_active_tab', tab);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  useEffect(() => {
    setSalarySlips(initialSalarySlips);
  }, [initialSalarySlips]);

  // Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState(initialSummary.month);
  const [selectedYear, setSelectedYear] = useState(initialSummary.year);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Leave Form State (Automatically Unpaid Leave)
  const [leaveType] = useState('UNPAID_LEAVE');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState('CUSTOM');
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Month change handler with URL state persistence
  const handleMonthChange = (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('month', String(m));
      url.searchParams.set('year', String(y));
      window.history.replaceState({}, '', url.toString());
    } catch {}
    startTransition(async () => {
      const data = await getPortalDashboardData(m, y);
      if (data.authenticated) {
        setSummary(data.summary);
        setAttendance([...data.attendanceList].sort((a, b) => b.dayNumber - a.dayNumber));
        if (data.salarySlips) setSalarySlips(data.salarySlips);
      }
    });
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [inAppPopup, setInAppPopup] = useState<{
    isOpen: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
  });

  // Real-time automatic background polling:
  // 1. Silent sync when tab/app becomes visible or gains focus (e.g. unlocking phone or switching back)
  // 2. Periodic polling every 45s while user is viewing the current month
  useEffect(() => {
    let isCancelled = false;

    const silentRefresh = async () => {
      try {
        const data = await getPortalDashboardData(selectedMonth, selectedYear);
        if (!isCancelled && data.authenticated) {
          setSummary(data.summary);
          setAttendance([...data.attendanceList].sort((a, b) => b.dayNumber - a.dayNumber));
          if (data.salarySlips) setSalarySlips(data.salarySlips);
        }
      } catch {
        // Silent failure so employee is never interrupted
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', silentRefresh);

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        silentRefresh();
      }
    }, 45000);

    return () => {
      isCancelled = true;
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', silentRefresh);
      clearInterval(intervalId);
    };
  }, [selectedMonth, selectedYear]);

  // Optional manual quick-refresh from period bar
  const handleManualRefresh = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      if (summary.isCurrentMonth) {
        await syncPortalRealtimeCloud(selectedMonth, selectedYear);
      }
      const data = await getPortalDashboardData(selectedMonth, selectedYear);
      if (data.authenticated) {
        setSummary(data.summary);
        setAttendance([...data.attendanceList].sort((a, b) => b.dayNumber - a.dayNumber));
        if (data.salarySlips) setSalarySlips(data.salarySlips);
      }
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out of the Employee Portal?')) {
      try {
        localStorage.removeItem('mpcg_portal_active_tab');
      } catch {}
      await logoutPortal();
      window.location.href = '/portal';
    }
  };

  // Submit Leave
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveSubmitting(true);
    setLeaveMsg(null);
    try {
      let calculatedHalfDayTime: string | undefined = undefined;
      if (isHalfDay) {
        if (!customStartTime || !customEndTime) {
          setLeaveMsg({ type: 'error', text: 'Please enter both start and end time for absent hours.' });
          setLeaveSubmitting(false);
          return;
        }
        if (customStartTime < '09:00' || customEndTime > '21:00') {
          setLeaveMsg({ type: 'error', text: 'Absent hours must be within clinic timing (09:00 AM to 09:00 PM).' });
          setLeaveSubmitting(false);
          return;
        }
        if (customEndTime <= customStartTime) {
          setLeaveMsg({ type: 'error', text: 'End Time must be later than Start Time.' });
          setLeaveSubmitting(false);
          return;
        }
        const diffText = calculateHoursDiff(customStartTime, customEndTime);
        calculatedHalfDayTime = `Absent: ${formatTimeTo12h(customStartTime)} - ${formatTimeTo12h(customEndTime)}${diffText ? ` (${diffText})` : ''}`;
      }

      const res = await submitPortalLeave({
        leaveType,
        fromDate: leaveFrom,
        toDate: isHalfDay ? leaveFrom : leaveTo,
        isHalfDay,
        halfDayType: 'CUSTOM',
        halfDayTime: calculatedHalfDayTime,
        reason: leaveReason,
      });
      if (res.success) {
        // Reset form fields and close modal
        setLeaveFrom('');
        setLeaveTo('');
        setLeaveReason('');
        setIsHalfDay(false);
        setHalfDayType('CUSTOM');
        setCustomStartTime('');
        setCustomEndTime('');
        setLeaveMsg(null);
        setIsLeaveModalOpen(false);

        // Refresh leaves list
        startTransition(async () => {
          const data = await getPortalDashboardData(selectedMonth, selectedYear);
          if (data.authenticated) setLeaves(data.leaves);
        });

        // Show prominent in-app submission success popup
        setInAppPopup({
          isOpen: true,
          type: 'success',
          title: 'Submission Successful',
          message: 'Your leave application has been successfully submitted and sent to HR for approval.',
        });
      } else {
        setLeaveMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setLeaveMsg({ type: 'error', text: err.message || 'Error submitting leave.' });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // State for cancelling pending leave
  const [cancellingLeaveId, setCancellingLeaveId] = useState<string | null>(null);
  const [confirmCancelLeave, setConfirmCancelLeave] = useState<any | null>(null);

  // Retract / Cancel Leave Application
  const handleCancelLeave = async (leaveId: string) => {
    setCancellingLeaveId(leaveId);
    try {
      const res = await cancelPortalLeave(leaveId);
      if (res.success) {
        setLeaves((prev) =>
          prev.map((l) => (l.id === leaveId ? { ...l, status: 'CANCELLED' } : l))
        );
        setConfirmCancelLeave(null);

        // Show prominent in-app cancellation popup
        setInAppPopup({
          isOpen: true,
          type: 'info',
          title: 'Leave Application Retracted',
          message: 'Your leave application has been successfully cancelled and withdrawn from HR review.',
        });

        // Silently refresh data to ensure consistency
        const refreshed = await getPortalDashboardData(selectedMonth, selectedYear);
        if (refreshed.authenticated) {
          setSummary(refreshed.summary);
          setAttendance([...refreshed.attendanceList].sort((a, b) => b.dayNumber - a.dayNumber));
        }
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to retract leave request.');
    } finally {
      setCancellingLeaveId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="portal-page-wrapper">
      {/* Sticky Top Navbar */}
      <header className="portal-navbar">
        <div className="portal-navbar-inner">
          <div className="portal-emp-badge">
            <MpcgBrandMark size={38} />
            <div>
              <div className="portal-emp-name">
                <span>{employee.name}</span>
                <span className="portal-code-chip">{employee.employeeId}</span>
              </div>
              <p className="portal-emp-sub">
                {employee.designation || 'Staff'} • {employee.department || 'Clinic'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="portal-logout-btn"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="portal-container" style={{ paddingTop: '1rem' }}>
        {/* Personal Warnings */}
        {warnings.length > 0 && (
          <div>
            {warnings.map((w) => (
              <div
                key={w.id}
                className={w.severity === 'urgent' ? 'portal-banner-urgent' : 'portal-banner-warning'}
              >
                <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{w.title}</span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '1px 5px', borderRadius: '4px', background: 'rgba(0,0,0,0.06)', fontFamily: 'monospace' }}>
                      {w.severity}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', lineHeight: 1.45 }}>{w.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Company Broadcast Announcement Banner */}
        {notices.length > 0 && (
          <div className="portal-banner-notice">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Bell size={16} color="#0f172a" style={{ flexShrink: 0 }} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                <strong style={{ color: '#0f172a' }}>{notices[0].title}: </strong>
                <span style={{ color: '#64748b' }}>{notices[0].content}</span>
              </div>
            </div>
            <button
              onClick={() => handleTabChange('notices')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0f172a',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0,
                padding: 0,
              }}
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
        )}

        {/* ============================================================
            TAB 1: ATTENDANCE
            ============================================================ */}
        {activeTab === 'attendance' && (
          <div className="portal-tab-content">
            {/* Month & Year Bar with Real-Time Indicator */}
            <div className="portal-period-card">
              <div className="portal-period-top">
                <div className="portal-period-title">
                  <Calendar size={15} color="#0f172a" />
                  <span>Attendance Period</span>
                </div>

                <div className="portal-period-actions">
                  {summary.isCurrentMonth && (
                    <div className="portal-live-pill" title="Real-time automatic sync active">
                      <span className="portal-live-dot" style={{ backgroundColor: '#059669' }} />
                      <span>LIVE</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isSyncing}
                    className="portal-refresh-icon-btn"
                    title="Check for new punches"
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>

              <div className="portal-period-controls-grid">
                <div className="portal-period-select-wrap">
                  <select
                    value={selectedMonth}
                    onChange={(e) => handleMonthChange(Number(e.target.value), selectedYear)}
                    className="portal-period-select"
                  >
                    <option value={10}>October</option>
                    <option value={11}>November</option>
                    <option value={12}>December</option>
                  </select>
                  <ChevronDown size={14} className="portal-period-chevron" />
                </div>

                <div className="portal-period-select-wrap">
                  <select
                    value={selectedYear}
                    onChange={(e) => handleMonthChange(selectedMonth, Number(e.target.value))}
                    className="portal-period-select"
                  >
                    <option value={2026}>2026</option>
                    <option value={2025}>2025</option>
                  </select>
                  <ChevronDown size={14} className="portal-period-chevron" />
                </div>
              </div>
            </div>

            {/* Monthly Summary Statistics Cards */}
            <div className="portal-stats-grid">
              <div className="portal-stat-card">
                <div className="portal-stat-label" style={{ color: '#059669' }}>Present Days</div>
                <div className="portal-stat-value">
                  {summary.presentDays}{' '}
                  <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>
                    / {summary.totalDays}
                  </span>
                </div>
                <div className="portal-stat-sub">
                  +{summary.halfDays} half days
                  {summary.isCurrentMonth && (
                    <span style={{ display: 'block', fontSize: '0.66rem', color: '#94a3b8', marginTop: '1px' }}>
                      (as of Day {summary.currentDay})
                    </span>
                  )}
                </div>
              </div>

              <div className="portal-stat-card">
                <div className="portal-stat-label" style={{ color: '#e11d48' }}>Absent / Applied Leave</div>
                <div className="portal-stat-value" style={{ color: '#be123c' }}>
                  {summary.absentDays + summary.unpaidLeaves}
                </div>
                <div className="portal-stat-sub">
                  {summary.paidLeaves > 0 ? `${summary.paidLeaves} Paid Leaves` : 'No paid leaves'}
                </div>
              </div>

              <div className="portal-stat-card">
                <div className="portal-stat-label" style={{ color: '#0f172a' }}>Hours Worked</div>
                <div className="portal-stat-value">
                  {summary.totalHoursWorked}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}> hrs</span>
                </div>
                <div className="portal-stat-sub">
                  {summary.totalOvertimeHours > 0 && summary.totalOvertimeHours >= summary.totalShortHours ? (
                    <span style={{ color: '#047857', fontWeight: 700 }}>
                      +{summary.totalOvertimeHours} hrs Overtime
                    </span>
                  ) : summary.totalShortHours > 0 ? (
                    <span style={{ color: '#b45309', fontWeight: 700 }}>
                      -{summary.totalShortHours} hrs Short Working
                    </span>
                  ) : (
                    <span style={{ color: '#64748b' }}>Standard hours met</span>
                  )}
                </div>
              </div>

              <div className="portal-stat-card">
                <div className="portal-stat-label" style={{ color: '#d97706' }}>Late & Missing</div>
                <div className="portal-stat-value" style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', flexWrap: 'wrap' }}>
                  <span>
                    {summary.lateCount} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>Late</span>
                  </span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ color: (summary.missingPunchCount || 0) > 0 ? '#c2410c' : '#0f172a' }}>
                    {summary.missingPunchCount || 0} <span style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b' }}>Missing</span>
                  </span>
                </div>
                <div className="portal-stat-sub">
                  {(summary.missingPunchCount || 0) > 0
                    ? `${summary.missingPunchCount} missing punch${summary.missingPunchCount > 1 ? 'es' : ''} (${summary.totalLateMinutes}m late)`
                    : summary.totalLateMinutes > 0
                    ? `${summary.totalLateMinutes} total mins late`
                    : 'All punches complete'}
                </div>
              </div>
            </div>

            {/* Daily Punch Logs */}
            <div className="portal-section-card">
              <div className="portal-section-header">
                <h3 className="portal-section-title">
                  Daily Punches & Attendance Records
                </h3>
                {isPending && <Loader2 size={14} className="animate-spin" color="#0f172a" />}
              </div>

              <div>
                {attendance.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No attendance records for {summary.monthName} {summary.year}.
                  </div>
                ) : (
                  attendance.map((day) => {
                    let badgeClass = 'portal-badge-off';
                    let badgeText = day.status.replace('_', ' ');

                    if (day.status === 'PRESENT') badgeClass = 'portal-badge-present';
                    if (day.status === 'HALF_DAY') badgeClass = 'portal-badge-half';
                    if (day.status === 'ABSENT') badgeClass = 'portal-badge-absent';
                    if (day.status === 'MISSING_PUNCH') badgeClass = 'portal-badge-missing';
                    if (day.status === 'PAID_LEAVE' || day.status === 'UNPAID_LEAVE') {
                      badgeClass = 'portal-badge-leave';
                      if (day.status === 'UNPAID_LEAVE') badgeText = 'Applied Leave';
                    }
                    if (day.status === 'PENDING_PUNCH') {
                      badgeClass = 'portal-badge-pending';
                      badgeText = 'Pending Punch of Today';
                    }

                    // For current date (today): NEVER show "MISSING PUNCH" because shift is in progress and employee punches at the end
                    if (day.isToday && (day.status === 'MISSING_PUNCH' || day.status === 'PENDING_PUNCH' || (!day.lastOut && day.firstIn))) {
                      badgeClass = 'portal-badge-pending';
                      badgeText = 'Pending Punch of Today';
                    }

                    return (
                      <div
                        key={day.id || day.dateStr}
                        className={`portal-day-row ${day.isToday ? 'portal-today-active' : ''}`}
                      >
                        {/* Header: Date + (Today badge) on left; (Late pill) + Status badge on right */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                            <span className="portal-day-date">{day.dayDisplay}</span>
                            {day.isToday && (
                              <span
                                style={{
                                  fontSize: '0.62rem',
                                  fontWeight: 800,
                                  letterSpacing: '0.06em',
                                  textTransform: 'uppercase',
                                  padding: '0.12rem 0.45rem',
                                  borderRadius: '999px',
                                  background: '#0f172a',
                                  color: '#ffffff',
                                }}
                              >
                                Today
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {day.lateMinutes > 0 && (
                              <span
                                style={{
                                  padding: '0.16rem 0.42rem',
                                  borderRadius: '6px',
                                  fontSize: '0.66rem',
                                  background: '#fffbeb',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {day.lateMinutes}m late
                              </span>
                            )}
                            <span className={`portal-badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              {day.isToday && badgeClass === 'portal-badge-pending' && (
                                <span className="portal-live-dot" />
                              )}
                              <span>{badgeText}</span>
                            </span>
                          </div>
                        </div>

                        {/* 4-Column Balanced Punch Grid */}
                        <div className="portal-punch-grid">
                          <div className="portal-punch-col">
                            <span className="portal-punch-label">In</span>
                            <span className="portal-punch-time" style={{ color: day.firstIn ? '#0f172a' : '#94a3b8' }}>
                              {formatPunchTime(day.firstIn)}
                            </span>
                          </div>

                          <div className="portal-punch-col">
                            <span className="portal-punch-label">Out</span>
                            <span className="portal-punch-time" style={{ color: day.lastOut ? '#0f172a' : '#94a3b8' }}>
                              {formatPunchTime(day.lastOut)}
                            </span>
                          </div>

                          <div className="portal-punch-col">
                            <span className="portal-punch-label">Worked</span>
                            <span className="portal-punch-time" style={{ color: day.workingHours > 0 ? '#0f172a' : '#94a3b8' }}>
                              {day.workingHoursDisplay || '--'}
                            </span>
                          </div>

                          <div className="portal-punch-col">
                            <span className="portal-punch-label">OT / Short</span>
                            <span className="portal-punch-time">
                              {day.overtimeDisplay ? (
                                <span style={{ color: '#047857', fontWeight: 800 }}>+{day.overtimeDisplay}</span>
                              ) : day.shortHoursDisplay ? (
                                <span style={{ color: '#b45309', fontWeight: 800 }}>-{day.shortHoursDisplay}</span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>--</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {/* Remarks / Missing Punch Explanation */}
                        {(day.remarks || (day.isToday && day.firstIn && !day.lastOut)) && (
                          <div
                            style={{
                              marginTop: '0.45rem',
                              fontSize: '0.72rem',
                              color: day.isToday && badgeClass === 'portal-badge-pending' ? '#0369a1' : '#475569',
                              background: day.isToday && badgeClass === 'portal-badge-pending' ? '#f0f9ff' : '#f8fafc',
                              borderLeft: day.isToday && badgeClass === 'portal-badge-pending' ? '3px solid #38bdf8' : '3px solid #cbd5e1',
                              padding: '0.35rem 0.55rem',
                              borderRadius: '4px',
                              lineHeight: 1.4,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {day.isToday && badgeClass === 'portal-badge-pending' && (
                              <span className="portal-live-dot" />
                            )}
                            <span>
                              {day.isToday
                                ? day.firstIn && !day.lastOut
                                  ? `Pending punch of today (Logged in at ${formatPunchTimeString(day.firstIn)} · Shift in progress)`
                                  : day.remarks && (day.remarks.toLowerCase().includes('missing punch') || day.remarks.toLowerCase().includes('out punch missing'))
                                  ? `Pending punch of today · Shift in progress`
                                  : day.remarks ? day.remarks.replace(/unpaid leave/gi, 'Applied Leave') : 'Pending punch of today'
                                : day.remarks ? day.remarks.replace(/unpaid leave/gi, 'Applied Leave') : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: LEAVES & SHIFTS
            ============================================================ */}
        {activeTab === 'leaves' && (
          <div className="portal-tab-content">
            {/* Quick Actions Header */}
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="portal-btn-primary"
                style={{ fontSize: '0.875rem', padding: '0.85rem 1rem' }}
              >
                <PlusCircle size={16} />
                <span>Apply for Leave</span>
              </button>
            </div>

            {/* Leave Applications History */}
            <div className="portal-section-card">
              <h3 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
                Your Leave Applications ({leaves.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {leaves.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No leave requests submitted yet.
                  </div>
                ) : (
                  leaves.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                            {(l.leaveType || 'LEAVE').replace('UNPAID_LEAVE', 'APPLIED LEAVE').replace('_', ' ')}
                          </span>
                          {l.isHalfDay && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}>
                              Half Day {l.halfDayTime ? `(${l.halfDayTime})` : l.halfDayType === 'SECOND_HALF' ? '(2nd Half)' : '(1st Half)'}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {l.status === 'APPROVED' && (
                            <span className="portal-badge portal-badge-present">
                              ✓ APPROVED
                            </span>
                          )}
                          {l.status === 'PENDING' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="portal-badge portal-badge-half">
                                ⏳ PENDING
                              </span>
                              <button
                                type="button"
                                onClick={() => setConfirmCancelLeave(l)}
                                disabled={cancellingLeaveId === l.id}
                                style={{
                                  background: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#be123c',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  transition: 'all 0.15s ease',
                                }}
                                title="Cancel this pending leave application"
                              >
                                {cancellingLeaveId === l.id ? (
                                  <>
                                    <Loader2 size={10} className="animate-spin" />
                                    <span>...</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={11} />
                                    <span>Cancel</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                          {l.status === 'REJECTED' && (
                            <span className="portal-badge portal-badge-absent">
                              ✕ REJECTED
                            </span>
                          )}
                          {l.status === 'CANCELLED' && (
                            <span
                              className="portal-badge"
                              style={{ background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1' }}
                            >
                              ⊘ CANCELLED
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace' }}>
                        <CalendarCheck size={13} color="#0f172a" />
                        <span>{l.fromDateStr} to {l.toDateStr}</span>
                      </div>

                      {l.reason && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
                          &ldquo;{l.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: SALARY SLIPS
            ============================================================ */}
        {activeTab === 'slips' && (
          <div className="portal-tab-content">
            <div className="portal-section-card">
              <div className="portal-section-header">
                <div>
                  <h3 className="portal-section-title">Official Salary Slips</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                    Verified payslips available for direct mobile download
                  </p>
                </div>
                <FileText size={20} color="#0f172a" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {salarySlips.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No finalized salary slips published yet.
                  </div>
                ) : (
                  salarySlips.map((slip) => (
                    <div
                      key={slip.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.85rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      {/* Top Header: Period on left, Clean status badge on right */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                          {slip.periodName}
                        </span>
                        <span className="portal-badge portal-badge-present">
                          ✓ Verified Payslip
                        </span>
                      </div>

                      {/* Middle Strip: Attendance stats & Gross earnings */}
                      <div
                        style={{
                          background: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          padding: '0.65rem 0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.55rem',
                        }}
                      >
                        {/* Row 1: Attendance stats */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.78rem',
                            color: '#64748b',
                            borderBottom: slip.grossSalary > 0 ? '1px dashed #e2e8f0' : 'none',
                            paddingBottom: slip.grossSalary > 0 ? '0.45rem' : '0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>Present:</span>
                            <strong style={{ color: '#047857' }}>{slip.presentDays} days</strong>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span>Applied Leave:</span>
                            <strong style={{ color: slip.lopDays > 0 ? '#be123c' : '#0f172a' }}>{slip.lopDays} days</strong>
                          </div>
                        </div>

                        {/* Row 2: Gross earnings & OT breakdown */}
                        {slip.grossSalary > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.5rem',
                              fontSize: '0.78rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ color: '#64748b' }}>Gross:</span>
                              <strong style={{ color: '#0f172a', fontWeight: 800 }}>{formatCurrency(slip.grossSalary)}</strong>
                            </div>

                            {slip.overtimeAmount > 0 ? (
                              <span
                                style={{
                                  background: 'rgba(4, 120, 87, 0.08)',
                                  border: '1px solid rgba(4, 120, 87, 0.2)',
                                  color: '#047857',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  whiteSpace: 'nowrap',
                                }}
                                title={`Base Salary: ${formatCurrency(slip.basicSalary)} + Overtime (${slip.overtimeHours} hrs): ${formatCurrency(slip.overtimeAmount)}`}
                              >
                                Base {formatCurrency(slip.basicSalary)} + {formatCurrency(slip.overtimeAmount)} OT
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                Base Salary: {formatCurrency(slip.basicSalary)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Deductions Breakdown Section */}
                      {slip.deductions && slip.deductions.length > 0 ? (
                        <div
                          style={{
                            background: 'rgba(254, 242, 242, 0.65)',
                            border: '1px solid rgba(254, 202, 202, 0.7)',
                            borderRadius: '12px',
                            padding: '0.75rem 0.85rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              color: '#991b1b',
                              borderBottom: '1px dashed rgba(254, 202, 202, 0.8)',
                              paddingBottom: '0.4rem',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <span>Deductions Applied</span>
                              <span
                                style={{
                                  background: 'rgba(220, 38, 38, 0.1)',
                                  color: '#dc2626',
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '999px',
                                }}
                              >
                                {slip.deductions.length} {slip.deductions.length === 1 ? 'item' : 'items'}
                              </span>
                            </span>
                            <span style={{ color: '#be123c', fontVariantNumeric: 'tabular-nums' }}>
                              Total: -{formatCurrency(slip.totalDeduction)}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {slip.deductions.map((d, dIdx) => (
                              <div
                                key={dIdx}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.2rem',
                                }}
                              >
                                {/* Main Deduction Item */}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    fontSize: '0.78rem',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: '#1e293b', fontWeight: 600 }}>{d.name}</span>
                                    {d.countDisplay && (
                                      <span
                                        style={{
                                          background: '#ffffff',
                                          border: '1px solid #fecdd3',
                                          color: '#be123c',
                                          fontSize: '0.68rem',
                                          fontWeight: 600,
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          lineHeight: 1.2,
                                        }}
                                      >
                                        {d.countDisplay}
                                      </span>
                                    )}
                                  </div>
                                  <span style={{ fontWeight: 700, color: '#be123c', fontVariantNumeric: 'tabular-nums' }}>
                                    -{formatCurrency(d.amount)}
                                  </span>
                                </div>

                                {/* Sub-items / Sub-columns breakdown (e.g. Late Coming, Missing Punch, Manual Adjustment) */}
                                {d.subItems && d.subItems.length > 0 && (
                                  <div
                                    style={{
                                      marginLeft: '0.65rem',
                                      paddingLeft: '0.65rem',
                                      borderLeft: '2px solid rgba(220, 38, 38, 0.25)',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '0.25rem',
                                      marginTop: '0.15rem',
                                    }}
                                  >
                                    {d.subItems.map((sub, sIdx) => (
                                      <div
                                        key={sIdx}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'space-between',
                                          fontSize: '0.72rem',
                                          color: '#475569',
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>↳</span>
                                          <span style={{ fontWeight: 500 }}>{sub.name}</span>
                                          {sub.countDisplay && (
                                            <span
                                              style={{
                                                background: 'rgba(254, 202, 202, 0.45)',
                                                border: '1px solid rgba(254, 202, 202, 0.8)',
                                                color: '#991b1b',
                                                fontSize: '0.64rem',
                                                fontWeight: 600,
                                                padding: '0px 4px',
                                                borderRadius: '3px',
                                                lineHeight: 1.3,
                                              }}
                                            >
                                              {sub.countDisplay}
                                            </span>
                                          )}
                                        </div>
                                        <span style={{ fontWeight: 600, color: '#991b1b', fontVariantNumeric: 'tabular-nums' }}>
                                          -{formatCurrency(sub.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div
                          style={{
                            background: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '10px',
                            padding: '0.45rem 0.75rem',
                            fontSize: '0.75rem',
                            color: '#15803d',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>✓</span>
                          <span>Nil Deductions (No salary deductions applied)</span>
                        </div>
                      )}

                      {/* Bottom Row: Net Salary & Download Button */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          paddingTop: '0.65rem',
                          borderTop: '1px solid #f1f5f9',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', fontWeight: 700 }}>
                            Net Take Home
                          </span>
                          <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(slip.netSalary)}
                          </span>
                        </div>

                        <a
                          href={slip.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portal-btn-primary portal-action-btn"
                          style={{
                            width: 'auto',
                            padding: '0.55rem 1rem',
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <Download size={14} />
                          <span>PDF Slip</span>
                        </a>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: NOTICES & PROFILE
            ============================================================ */}
        {activeTab === 'notices' && (
          <div className="portal-tab-content">
            {/* Directives / Warnings */}
            {warnings.length > 0 && (
              <div className="portal-section-card" style={{ borderColor: '#fde68a' }}>
                <h3 className="portal-section-title" style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                  <ShieldAlert size={16} /> Personal Warnings & Directives
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {warnings.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        padding: '0.85rem',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#92400e' }}>{w.title}</div>
                      <p style={{ margin: '0.25rem 0', color: '#78350f', lineHeight: 1.45 }}>{w.message}</p>
                      <div style={{ fontSize: '0.68rem', color: '#b45309', fontFamily: 'monospace' }}>
                        Issued: {new Date(w.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Broadcasts */}
            <div className="portal-section-card">
              <h3 className="portal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                <Bell size={16} color="#0f172a" /> Clinic Announcements & Updates
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {notices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.8rem' }}>
                    No active company announcements.
                  </div>
                ) : (
                  notices.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.85rem 1rem',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{n.title}</span>
                        <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: '#475569', lineHeight: 1.45 }}>{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Employee Profile Card */}
            <div className="portal-section-card">
              <h3 className="portal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.85rem' }}>
                <User size={16} color="#0f172a" /> Your Employee Profile
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Full Name</span>
                  <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{employee.name}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Employee Code</span>
                  <strong style={{ fontSize: '0.825rem', color: '#0f172a', fontFamily: 'monospace' }}>{employee.employeeId}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Designation</span>
                  <strong style={{ fontSize: '0.825rem', color: '#334155' }}>{employee.designation || 'Staff'}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Department</span>
                  <strong style={{ fontSize: '0.825rem', color: '#334155' }}>{employee.department || 'Operations'}</strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Assigned Shift</span>
                  <strong style={{ fontSize: '0.825rem', color: '#334155', fontFamily: 'monospace' }}>
                    {employee.shiftStartTime || '09:00'} - {employee.shiftEndTime || '18:00'}
                  </strong>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', fontWeight: 600 }}>Registered WhatsApp</span>
                  <strong style={{ fontSize: '0.825rem', color: '#334155', fontFamily: 'monospace' }}>
                    {employee.mobile ? `+91 ${employee.mobile.slice(-10)}` : 'Not Set'}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="portal-bottom-nav">
        <div className="portal-bottom-nav-inner">
          <button
            type="button"
            onClick={() => handleTabChange('attendance')}
            className={`portal-nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          >
            <Calendar size={18} />
            <span>Attendance</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('leaves')}
            className={`portal-nav-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          >
            <CalendarCheck size={18} />
            <span>Leaves</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('slips')}
            className={`portal-nav-btn ${activeTab === 'slips' ? 'active' : ''}`}
          >
            <FileText size={18} />
            <span>Salary Slips</span>
            {salarySlips && salarySlips.length > 0 && (
              <span
                className="portal-nav-dot"
                style={{
                  backgroundColor: '#10b981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.7)',
                }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('notices')}
            className={`portal-nav-btn ${activeTab === 'notices' ? 'active' : ''}`}
          >
            <Bell size={18} />
            <span>Updates</span>
            {(warnings.length > 0 || notices.length > 0) && <span className="portal-nav-dot" />}
          </button>
        </div>
      </nav>

      {/* Modal: Confirm Cancel Pending Leave */}
      {confirmCancelLeave && (
        <div
          className="portal-modal-backdrop"
          onClick={() => {
            if (!cancellingLeaveId) setConfirmCancelLeave(null);
          }}
        >
          <div
            className="portal-modal-box"
            style={{ maxWidth: '420px', padding: '1.25rem' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.75rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <XCircle size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Retract Leave Application?
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Withdraw your request before HR approval
                </span>
              </div>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0.75rem 0.85rem',
                fontSize: '0.78rem',
                color: '#334155',
                marginBottom: '0.85rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div>
                <strong style={{ color: '#0f172a' }}>Dates:</strong> {confirmCancelLeave.fromDateStr} to {confirmCancelLeave.toDateStr}
                {confirmCancelLeave.isHalfDay && ' (Half Day)'}
              </div>
              {confirmCancelLeave.reason && (
                <div style={{ color: '#64748b', fontStyle: 'italic' }}>
                  &ldquo;{confirmCancelLeave.reason}&rdquo;
                </div>
              )}
            </div>

            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.78rem', color: '#64748b', lineHeight: 1.45 }}>
              Are you sure you want to cancel this leave application? Once cancelled, the request will be withdrawn and will not be reviewed by HR.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setConfirmCancelLeave(null)}
                disabled={Boolean(cancellingLeaveId)}
                className="portal-btn-secondary"
                style={{
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '10px',
                }}
              >
                Keep Request
              </button>
              <button
                type="button"
                onClick={() => handleCancelLeave(confirmCancelLeave.id)}
                disabled={Boolean(cancellingLeaveId)}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '0.65rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {cancellingLeaveId ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={14} />
                    <span>Yes, Cancel</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apply for Leave */}
      {isLeaveModalOpen && (
        <div className="portal-modal-backdrop">
          <div className="portal-modal-box">
            <div className="portal-modal-header">
              <h3 className="portal-modal-title">
                <PlusCircle size={18} color="#0f172a" />
                <span>Apply for Leave</span>
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="portal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="portal-form-label">Leave Type</label>
                <div
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
                    Applied Leave
                  </span>
                  <span
                    className="portal-badge"
                    style={{ background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}
                  >
                    Automatic
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label className="portal-form-label">From Date</label>
                  <input
                    type="date"
                    required
                    value={leaveFrom}
                    onChange={(e) => {
                      setLeaveFrom(e.target.value);
                      if (!leaveTo) setLeaveTo(e.target.value);
                    }}
                    className="portal-text-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label className="portal-form-label">To Date</label>
                  <input
                    type="date"
                    required
                    value={leaveTo}
                    onChange={(e) => setLeaveTo(e.target.value)}
                    className="portal-text-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '0.25rem' }}>
                <input
                  type="checkbox"
                  id="halfDayCheckbox"
                  checked={isHalfDay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsHalfDay(checked);
                    if (checked && leaveFrom) {
                      setLeaveTo(leaveFrom);
                    }
                  }}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="halfDayCheckbox" style={{ fontSize: '0.8rem', color: '#0f172a', cursor: 'pointer', fontWeight: 600 }}>
                  This is a Half-Day Leave
                </label>
              </div>

              {isHalfDay && (
                <div
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '0.75rem 0.85rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.65rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#dc2626' }}>
                      Mention your absent hour
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                    <div>
                      <label className="portal-form-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>
                        Absent From (Start)
                      </label>
                      <select
                        required={isHalfDay}
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        className="portal-text-input"
                        style={{ fontSize: '0.85rem', width: '100%', background: '#ffffff', cursor: 'pointer' }}
                      >
                        <option value="">-- Select Start Time --</option>
                        {CLINIC_TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="portal-form-label" style={{ fontSize: '0.72rem', marginBottom: '3px' }}>
                        Absent Until (End)
                      </label>
                      <select
                        required={isHalfDay}
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        className="portal-text-input"
                        style={{ fontSize: '0.85rem', width: '100%', background: '#ffffff', cursor: 'pointer' }}
                      >
                        <option value="">-- Select End Time --</option>
                        {CLINIC_TIME_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quick Timing Chips */}
                  <div>
                    <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                      Quick absent presets:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {[
                        { label: '10 AM - 2 PM', start: '10:00', end: '14:00' },
                        { label: '11 AM - 3 PM', start: '11:00', end: '15:00' },
                        { label: '1 PM - 5 PM', start: '13:00', end: '17:00' },
                        { label: '3 PM - 7 PM', start: '15:00', end: '19:00' },
                        { label: '5 PM - 9 PM', start: '17:00', end: '21:00' },
                      ].map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCustomStartTime(chip.start);
                            setCustomEndTime(chip.end);
                          }}
                          style={{
                            background: customStartTime === chip.start && customEndTime === chip.end ? '#0f172a' : '#ffffff',
                            color: customStartTime === chip.start && customEndTime === chip.end ? '#ffffff' : '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="portal-form-label">Reason / Explanation</label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Explain reason for leave..."
                  className="portal-text-input"
                  style={{ fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              {leaveMsg && (
                <div className={leaveMsg.type === 'success' ? 'portal-alert-success' : 'portal-alert-error'}>
                  {leaveMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="portal-btn-primary"
                style={{
                  marginTop: '0.65rem',
                  marginBottom: '1.25rem',
                  padding: '0.85rem 1rem',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                  flexShrink: 0,
                }}
              >
                {leaveSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Submit Leave Application</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* In-App Result Popup Dialog (Replaces native browser alert) */}
      {inAppPopup.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
          }}
          onClick={() => setInAppPopup((p) => ({ ...p, isOpen: false }))}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.85rem',
              animation: 'scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Circular icon badge */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: inAppPopup.type === 'success' ? '#ecfdf5' : '#fff1f2',
                border: inAppPopup.type === 'success' ? '2px solid #a7f3d0' : '2px solid #fecdd3',
              }}
            >
              {inAppPopup.type === 'success' ? (
                <CheckCircle2 size={28} color="#059669" />
              ) : (
                <AlertCircle size={28} color="#e11d48" />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {inAppPopup.title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#475569', lineHeight: 1.5 }}>
                {inAppPopup.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setInAppPopup((p) => ({ ...p, isOpen: false }))}
              className="portal-btn-primary"
              style={{
                marginTop: '0.5rem',
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.88rem',
                borderRadius: '12px',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
