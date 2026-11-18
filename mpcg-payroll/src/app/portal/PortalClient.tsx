'use client';

import React, { useState, useTransition } from 'react';
import {
  PortalAttendanceDay,
  PortalAttendanceSummary,
  PortalSalarySlipItem,
  getPortalDashboardData,
  submitPortalLeave,
  syncPortalRealtimeCloud,
  recalculatePortalAttendance,
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
  ShieldAlert,
  X,
  Send,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { MpcgBrandMark } from '@/components/brand/MpcgLogo';
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt';
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
}: PortalClientProps) {
  const [activeTab, setActiveTab] = useState<'attendance' | 'leaves' | 'slips' | 'notices'>('attendance');
  const [employee] = useState<PortalSessionEmployee>(initialEmployee);
  const [summary, setSummary] = useState<PortalAttendanceSummary>(initialSummary);
  const [attendance, setAttendance] = useState<PortalAttendanceDay[]>(() =>
    [...initialAttendance].sort((a, b) => b.dayNumber - a.dayNumber)
  );
  const [leaves, setLeaves] = useState<any[]>(initialLeaves);
  const [shiftOverrides, setShiftOverrides] = useState<any[]>(initialShiftOverrides);
  const [salarySlips] = useState<PortalSalarySlipItem[]>(initialSalarySlips);
  const [notices] = useState<BroadcastNotice[]>(initialNotices);
  const [warnings] = useState<EmployeeWarning[]>(initialWarnings);

  // Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState(initialSummary.month);
  const [selectedYear, setSelectedYear] = useState(initialSummary.year);
  const [isPending, startTransition] = useTransition();

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Leave Form State (Automatically Unpaid Leave)
  const [leaveType] = useState('UNPAID_LEAVE');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState('FIRST_HALF');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Month change handler
  const handleMonthChange = (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    startTransition(async () => {
      const data = await getPortalDashboardData(m, y);
      if (data.authenticated) {
        setSummary(data.summary);
        setAttendance([...data.attendanceList].sort((a, b) => b.dayNumber - a.dayNumber));
      }
    });
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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

  // Refresh Realtime Cloud Punches
  const handleSyncRealtime = async () => {
    setIsSyncing(true);
    setSyncNotice(null);
    try {
      const res = await syncPortalRealtimeCloud(selectedMonth, selectedYear);
      const data = await getPortalDashboardData(selectedMonth, selectedYear);
      if (data.authenticated) {
        setSummary(data.summary);
        setAttendance([...data.attendanceList].sort((a, b) => b.dayNumber - a.dayNumber));
      }
      setInAppPopup({
        isOpen: true,
        type: res.success ? 'success' : 'error',
        title: res.success ? 'Sync Completed' : 'Sync Notice',
        message: res.message || (res.success ? 'Attendance refreshed and updated successfully!' : 'Refresh failed'),
      });
    } catch (err: any) {
      setInAppPopup({
        isOpen: true,
        type: 'error',
        title: 'Sync Error',
        message: err.message || 'Failed to sync with biometric cloud.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Recalculate Attendance from Punches
  const handleRecalculate = async () => {
    setIsRecalculating(true);
    setSyncNotice(null);
    try {
      const res = await recalculatePortalAttendance(selectedMonth, selectedYear);
      const data = await getPortalDashboardData(selectedMonth, selectedYear);
      if (data.authenticated) {
        setSummary(data.summary);
        setAttendance([...data.attendanceList].sort((a, b) => b.dayNumber - a.dayNumber));
      }
      setInAppPopup({
        isOpen: true,
        type: res.success ? 'success' : 'error',
        title: res.success ? 'Recalculation Complete' : 'Notice',
        message: res.message || (res.success ? 'Attendance recalculated successfully!' : 'Recalculation failed'),
      });
    } catch (err: any) {
      setInAppPopup({
        isOpen: true,
        type: 'error',
        title: 'Recalculation Error',
        message: err.message || 'Recalculation failed.',
      });
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out of the Employee Portal?')) {
      await logoutPortal();
      window.location.reload();
    }
  };

  // Submit Leave
  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveSubmitting(true);
    setLeaveMsg(null);
    try {
      const res = await submitPortalLeave({
        leaveType,
        fromDate: leaveFrom,
        toDate: leaveTo,
        isHalfDay,
        halfDayType,
        reason: leaveReason,
      });
      if (res.success) {
        // Reset form fields and close modal
        setLeaveFrom('');
        setLeaveTo('');
        setLeaveReason('');
        setIsHalfDay(false);
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PwaInstallPrompt variant="header" />
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="portal-logout-btn"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="portal-container" style={{ paddingTop: '1rem' }}>
        {/* PWA Install Banner */}
        <PwaInstallPrompt variant="banner" />

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
              onClick={() => setActiveTab('notices')}
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
          <div>
            {/* Month & Year Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'wrap',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '0.65rem 0.85rem',
                marginBottom: '0.85rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Calendar size={14} color="#0f172a" />
                <span>Attendance Period</span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value), selectedYear)}
                  className="portal-text-input"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', width: 'auto' }}
                >
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => handleMonthChange(selectedMonth, Number(e.target.value))}
                  className="portal-text-input"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.78rem', width: 'auto' }}
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
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
                <div className="portal-stat-label" style={{ color: '#e11d48' }}>Absent / LOP</div>
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

            {/* Refresh & Recalculate Control Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <button
                type="button"
                disabled={isSyncing || isRecalculating || isPending}
                onClick={handleSyncRealtime}
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  border: '1px solid #0284c7',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isSyncing || isPending ? 'not-allowed' : 'pointer',
                  opacity: isSyncing || isPending ? 0.7 : 1,
                  boxShadow: '0 1px 3px rgba(2, 132, 199, 0.25)',
                  whiteSpace: 'nowrap',
                }}
                title="Refresh and sync biometric punches from Realsoft Cloud"
              >
                {isSyncing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <RefreshCw size={15} />
                )}
                <span>{isSyncing ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                disabled={isSyncing || isRecalculating || isPending}
                onClick={handleRecalculate}
                style={{
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: isRecalculating || isPending ? 'not-allowed' : 'pointer',
                  opacity: isRecalculating || isPending ? 0.7 : 1,
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  whiteSpace: 'nowrap',
                }}
                title="Recalculate attendance records from punch logs"
              >
                {isRecalculating ? <Loader2 size={15} className="animate-spin" /> : <span>🔄</span>}
                <span>{isRecalculating ? 'Recalculating...' : 'Recalculate'}</span>
              </button>
            </div>

            {/* Active Loading Bar while Refresh or Recalculate is in progress */}
            {(isSyncing || isRecalculating) && (
              <div className="portal-sync-loading-container">
                <div className="portal-sync-loading-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Loader2 size={14} className="animate-spin" color="#0284c7" />
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>
                      {isSyncing
                        ? 'Connecting to biometric cloud & refreshing live punches...'
                        : 'Recalculating attendance records & working hours...'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                    Please wait...
                  </span>
                </div>
                <div className="portal-progress-track">
                  <div className="portal-progress-bar-indeterminate" />
                </div>
              </div>
            )}

            {/* Inline Result Feedback Banner */}
            {syncNotice && (
              <div
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                  background: syncNotice.type === 'success' ? '#f0fdf4' : '#fff1f2',
                  border: `1px solid ${syncNotice.type === 'success' ? '#bbf7d0' : '#fecdd3'}`,
                  color: syncNotice.type === 'success' ? '#15803d' : '#be123c',
                }}
              >
                <span>{syncNotice.message}</span>
                <button
                  type="button"
                  onClick={() => setSyncNotice(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}
                >
                  <X size={14} />
                </button>
              </div>
            )}

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
                    if (day.status === 'PAID_LEAVE' || day.status === 'UNPAID_LEAVE') badgeClass = 'portal-badge-leave';
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
                      <div key={day.id || day.dateStr} className="portal-day-row">
                        {/* Header: Date + (Today badge) on left; (Late pill) + Status badge on right */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
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

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
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
                            <span className={`portal-badge ${badgeClass}`}>
                              {badgeText}
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
                            }}
                          >
                            {day.isToday
                              ? day.firstIn && !day.lastOut
                                ? `Pending punch of today (Logged in at ${formatPunchTimeString(day.firstIn)} · Shift in progress)`
                                : day.remarks && (day.remarks.toLowerCase().includes('missing punch') || day.remarks.toLowerCase().includes('out punch missing'))
                                ? `Pending punch of today · Shift in progress`
                                : day.remarks || 'Pending punch of today'
                              : day.remarks}
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
          <div>
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
                            {l.leaveType.replace('_', ' ')}
                          </span>
                          {l.isHalfDay && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}>
                              Half Day
                            </span>
                          )}
                        </div>

                        {l.status === 'APPROVED' && (
                          <span className="portal-badge portal-badge-present">
                            ✓ APPROVED
                          </span>
                        )}
                        {l.status === 'PENDING' && (
                          <span className="portal-badge portal-badge-half">
                            ⏳ PENDING
                          </span>
                        )}
                        {l.status === 'REJECTED' && (
                          <span className="portal-badge portal-badge-absent">
                            ✕ REJECTED
                          </span>
                        )}
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
          <div>
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
                            <span>LOP:</span>
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

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {slip.deductions.map((d, dIdx) => (
                              <div
                                key={dIdx}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '0.78rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: '#334155', fontWeight: 500 }}>{d.name}</span>
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
                          className="portal-btn-primary"
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
          <div>
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
            onClick={() => setActiveTab('attendance')}
            className={`portal-nav-btn ${activeTab === 'attendance' ? 'active' : ''}`}
          >
            <Calendar size={18} />
            <span>Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`portal-nav-btn ${activeTab === 'leaves' ? 'active' : ''}`}
          >
            <CalendarCheck size={18} />
            <span>Leaves</span>
          </button>

          <button
            onClick={() => setActiveTab('slips')}
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
            onClick={() => setActiveTab('notices')}
            className={`portal-nav-btn ${activeTab === 'notices' ? 'active' : ''}`}
          >
            <Bell size={18} />
            <span>Updates</span>
            {(warnings.length > 0 || notices.length > 0) && <span className="portal-nav-dot" />}
          </button>
        </div>
      </nav>

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
                    Unpaid Leave
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
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <label htmlFor="halfDayCheckbox" style={{ fontSize: '0.8rem', color: '#0f172a', cursor: 'pointer', fontWeight: 600 }}>
                  This is a Half-Day Leave
                </label>
              </div>

              {isHalfDay && (
                <div>
                  <label className="portal-form-label">Half-Day Timing Slot</label>
                  <select
                    value={halfDayType}
                    onChange={(e) => setHalfDayType(e.target.value)}
                    className="portal-text-input"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="FIRST_HALF">First Half (Morning)</option>
                    <option value="SECOND_HALF">Second Half (Afternoon/Evening)</option>
                  </select>
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
