'use client';

import React, { useState, useTransition } from 'react';
import {
  PortalAttendanceDay,
  PortalAttendanceSummary,
  PortalSalarySlipItem,
  getPortalDashboardData,
  submitPortalLeave,
  submitPortalShiftRequest,
} from '@/actions/portal-data';
import { logoutPortal, PortalSessionEmployee } from '@/actions/portal-auth';
import { BroadcastNotice, EmployeeWarning } from '@/actions/portal-notices';
import {
  Calendar,
  Clock,
  FileText,
  User,
  LogOut,
  Bell,
  CheckCircle2,
  XCircle,
  Clock4,
  PlusCircle,
  Download,
  CalendarCheck,
  ChevronRight,
  ShieldAlert,
  X,
  Send,
  Loader2,
} from 'lucide-react';
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
  const [attendance, setAttendance] = useState<PortalAttendanceDay[]>(initialAttendance);
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
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState('CASUAL_LEAVE');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState('FIRST_HALF');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveMsg, setLeaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Shift Form State
  const [shiftFrom, setShiftFrom] = useState('');
  const [shiftTo, setShiftTo] = useState('');
  const [shiftStart, setShiftStart] = useState('10:00');
  const [shiftEnd, setShiftEnd] = useState('19:00');
  const [shiftReason, setShiftReason] = useState('');
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [shiftMsg, setShiftMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Month change handler
  const handleMonthChange = (m: number, y: number) => {
    setSelectedMonth(m);
    setSelectedYear(y);
    startTransition(async () => {
      const data = await getPortalDashboardData(m, y);
      if (data.authenticated) {
        setSummary(data.summary);
        setAttendance(data.attendanceList);
      }
    });
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
        setLeaveMsg({ type: 'success', text: res.message });
        setTimeout(() => {
          setIsLeaveModalOpen(false);
          setLeaveMsg(null);
          startTransition(async () => {
            const data = await getPortalDashboardData(selectedMonth, selectedYear);
            if (data.authenticated) setLeaves(data.leaves);
          });
        }, 1500);
      } else {
        setLeaveMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setLeaveMsg({ type: 'error', text: err.message || 'Error submitting leave.' });
    } finally {
      setLeaveSubmitting(false);
    }
  };

  // Submit Shift Request
  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShiftSubmitting(true);
    setShiftMsg(null);
    try {
      const res = await submitPortalShiftRequest({
        fromDate: shiftFrom,
        toDate: shiftTo,
        shiftStartTime: shiftStart,
        shiftEndTime: shiftEnd,
        reason: shiftReason,
      });
      if (res.success) {
        setShiftMsg({ type: 'success', text: res.message });
        setTimeout(() => {
          setIsShiftModalOpen(false);
          setShiftMsg(null);
          startTransition(async () => {
            const data = await getPortalDashboardData(selectedMonth, selectedYear);
            if (data.authenticated) setShiftOverrides(data.shiftOverrides);
          });
        }, 1500);
      } else {
        setShiftMsg({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setShiftMsg({ type: 'error', text: err.message || 'Error submitting shift request.' });
    } finally {
      setShiftSubmitting(false);
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
            <div className="portal-emp-avatar">
              <span>{employee.name ? employee.name.charAt(0).toUpperCase() : 'M'}</span>
            </div>
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
                <ShieldAlert size={20} style={{ flexShrink: 0, color: w.severity === 'urgent' ? '#f43f5e' : '#f59e0b', marginTop: '2px' }} />
                <div style={{ fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{w.title}</span>
                    <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', padding: '1px 5px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', fontFamily: 'monospace' }}>
                      {w.severity}
                    </span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', lineHeight: 1.45, color: '#f1f5f9' }}>{w.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Company Broadcast Announcement Banner */}
        {notices.length > 0 && (
          <div className="portal-banner-notice">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <Bell size={16} color="var(--portal-cyan)" style={{ flexShrink: 0 }} />
              <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>
                <strong style={{ color: '#ffffff' }}>{notices[0].title}: </strong>
                <span style={{ color: 'var(--portal-text-muted)' }}>{notices[0].content}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('notices')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--portal-cyan)',
                fontSize: '0.75rem',
                fontWeight: 600,
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
                background: 'var(--portal-card-bg)',
                border: '1px solid var(--portal-card-border)',
                borderRadius: '16px',
                padding: '0.65rem 0.85rem',
                marginBottom: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--portal-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <Calendar size={14} color="var(--portal-cyan)" />
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
              <div className="portal-stat-card" style={{ borderColor: 'rgba(16, 185, 129, 0.25)' }}>
                <div className="portal-stat-label" style={{ color: 'var(--portal-emerald)' }}>Present Days</div>
                <div className="portal-stat-value">
                  {summary.presentDays} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--portal-text-muted)' }}>/ {summary.totalDays}</span>
                </div>
                <div className="portal-stat-sub">+{summary.halfDays} half days</div>
              </div>

              <div className="portal-stat-card" style={{ borderColor: 'rgba(244, 63, 94, 0.25)' }}>
                <div className="portal-stat-label" style={{ color: 'var(--portal-rose)' }}>Absent / LOP</div>
                <div className="portal-stat-value" style={{ color: '#fda4af' }}>
                  {summary.absentDays + summary.unpaidLeaves}
                </div>
                <div className="portal-stat-sub">
                  {summary.paidLeaves > 0 ? `${summary.paidLeaves} Paid Leaves` : 'No paid leaves'}
                </div>
              </div>

              <div className="portal-stat-card" style={{ borderColor: 'rgba(6, 182, 212, 0.25)' }}>
                <div className="portal-stat-label" style={{ color: 'var(--portal-cyan)' }}>Hours Worked</div>
                <div className="portal-stat-value">
                  {summary.totalHoursWorked}<span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--portal-text-muted)' }}> hrs</span>
                </div>
                <div className="portal-stat-sub">OT: {summary.totalOvertimeHours} hrs</div>
              </div>

              <div className="portal-stat-card" style={{ borderColor: 'rgba(245, 158, 11, 0.25)' }}>
                <div className="portal-stat-label" style={{ color: 'var(--portal-amber)' }}>Late Arrivals</div>
                <div className="portal-stat-value" style={{ color: '#fde68a' }}>
                  {summary.lateCount}
                </div>
                <div className="portal-stat-sub">{summary.totalLateMinutes} total mins</div>
              </div>
            </div>

            {/* Daily Punch Logs */}
            <div className="portal-section-card">
              <div className="portal-section-header">
                <h3 className="portal-section-title">
                  Daily Punches & Attendance Records
                </h3>
                {isPending && <Loader2 size={14} className="animate-spin" color="var(--portal-cyan)" />}
              </div>

              <div>
                {attendance.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--portal-text-dim)', fontSize: '0.8rem' }}>
                    No attendance records for {summary.monthName} {summary.year}.
                  </div>
                ) : (
                  attendance.map((day) => {
                    let badgeClass = 'portal-badge-off';
                    if (day.status === 'PRESENT') badgeClass = 'portal-badge-present';
                    if (day.status === 'HALF_DAY') badgeClass = 'portal-badge-half';
                    if (day.status === 'ABSENT') badgeClass = 'portal-badge-absent';
                    if (day.status === 'PAID_LEAVE' || day.status === 'UNPAID_LEAVE') badgeClass = 'portal-badge-leave';

                    return (
                      <div key={day.id || day.dateStr} className="portal-day-row">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span className="portal-day-date">{day.dayDisplay}</span>
                          <span className={`portal-badge ${badgeClass}`}>
                            {day.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
                          <div className="portal-punch-group">
                            <div className="portal-punch-item">
                              <span className="portal-punch-label">In</span>
                              <span
                                className="portal-punch-time"
                                style={{ color: day.firstIn ? 'var(--portal-emerald)' : 'var(--portal-text-dim)' }}
                              >
                                {day.firstIn || '--:--'}
                              </span>
                            </div>

                            <div className="portal-punch-item">
                              <span className="portal-punch-label">Out</span>
                              <span
                                className="portal-punch-time"
                                style={{ color: day.lastOut ? 'var(--portal-rose)' : 'var(--portal-text-dim)' }}
                              >
                                {day.lastOut || '--:--'}
                              </span>
                            </div>

                            <div className="portal-punch-item" style={{ minWidth: '50px' }}>
                              <span className="portal-punch-label">Worked</span>
                              <span className="portal-punch-time" style={{ color: 'var(--portal-cyan)' }}>
                                {day.workingHours > 0 ? `${day.workingHours.toFixed(2)}h` : '--'}
                              </span>
                            </div>
                          </div>

                          {day.lateMinutes > 0 && (
                            <span
                              style={{
                                padding: '0.15rem 0.45rem',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: '#fde68a',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                              }}
                            >
                              {day.lateMinutes}m late
                            </span>
                          )}
                        </div>

                        {day.remarks && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--portal-text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.35rem 0.5rem', borderRadius: '8px' }}>
                            {day.remarks}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '1rem' }}>
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="portal-btn-primary"
                style={{ fontSize: '0.825rem', padding: '0.75rem 0.5rem' }}
              >
                <PlusCircle size={15} />
                <span>Apply Leave</span>
              </button>

              <button
                onClick={() => setIsShiftModalOpen(true)}
                className="portal-btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                  boxShadow: '0 10px 20px -5px rgba(124, 58, 237, 0.4)',
                  fontSize: '0.825rem',
                  padding: '0.75rem 0.5rem',
                }}
              >
                <Clock size={15} />
                <span>Shift Change</span>
              </button>
            </div>

            {/* Leave Applications History */}
            <div className="portal-section-card">
              <h3 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
                Your Leave Applications ({leaves.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {leaves.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--portal-text-dim)', fontSize: '0.8rem' }}>
                    No leave requests submitted yet.
                  </div>
                ) : (
                  leaves.map((l) => (
                    <div
                      key={l.id}
                      style={{
                        background: 'rgba(7, 12, 24, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#ffffff' }}>
                            {l.leaveType.replace('_', ' ')}
                          </span>
                          {l.isHalfDay && (
                            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.15)', color: '#fde68a', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
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

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--portal-text-muted)', fontFamily: 'monospace' }}>
                        <CalendarCheck size={13} color="var(--portal-cyan)" />
                        <span>{l.fromDateStr} to {l.toDateStr}</span>
                      </div>

                      {l.reason && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--portal-text-muted)', background: 'rgba(0,0,0,0.2)', padding: '0.4rem 0.6rem', borderRadius: '8px' }}>
                          &ldquo;{l.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Shift Override Requests */}
            <div className="portal-section-card">
              <h3 className="portal-section-title" style={{ marginBottom: '0.75rem' }}>
                Shift Timing Change Requests ({shiftOverrides.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {shiftOverrides.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--portal-text-dim)', fontSize: '0.8rem' }}>
                    No shift timing requests.
                  </div>
                ) : (
                  shiftOverrides.map((s) => (
                    <div
                      key={s.id}
                      style={{
                        background: 'rgba(7, 12, 24, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '16px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#ffffff' }}>
                          Timing: <strong style={{ color: 'var(--portal-cyan)', fontFamily: 'monospace' }}>{s.shiftStartTime} - {s.shiftEndTime}</strong>
                        </span>
                        <span className={`portal-badge ${s.status === 'APPROVED' ? 'portal-badge-present' : s.status === 'REJECTED' ? 'portal-badge-absent' : 'portal-badge-half'}`}>
                          {s.status}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)', fontFamily: 'monospace' }}>
                        Period: {s.fromDateStr} to {s.toDateStr}
                      </div>
                      {s.reason && (
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--portal-text-muted)' }}>
                          {s.reason}
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
                  <p style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)', margin: '0.2rem 0 0 0' }}>
                    Verified payslips available for direct mobile download
                  </p>
                </div>
                <FileText size={20} color="var(--portal-emerald)" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {salarySlips.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--portal-text-dim)', fontSize: '0.8rem' }}>
                    No finalized salary slips published yet.
                  </div>
                ) : (
                  salarySlips.map((slip) => (
                    <div
                      key={slip.id}
                      style={{
                        background: 'rgba(7, 12, 24, 0.7)',
                        border: '1px solid var(--portal-card-border)',
                        borderRadius: '16px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ffffff' }}>
                            {slip.periodName}
                          </span>
                          <span className="portal-badge portal-badge-present">
                            {slip.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: 'var(--portal-text-muted)', display: 'flex', gap: '8px' }}>
                          <span>Pres: <strong style={{ color: '#ffffff' }}>{slip.presentDays}d</strong></span>
                          <span>LOP: <strong style={{ color: 'var(--portal-rose)' }}>{slip.lopDays}d</strong></span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.65rem',
                          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--portal-text-dim)', display: 'block' }}>
                            Net Take Home
                          </span>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--portal-emerald)', fontFamily: 'monospace' }}>
                            {formatCurrency(slip.netSalary)}
                          </span>
                        </div>

                        <a
                          href={slip.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portal-btn-primary portal-btn-emerald"
                          style={{ width: 'auto', padding: '0.6rem 1rem', fontSize: '0.78rem', textDecoration: 'none' }}
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
              <div className="portal-section-card" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                <h3 className="portal-section-title" style={{ color: 'var(--portal-amber)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                  <ShieldAlert size={16} /> Personal Warnings & Directives
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {warnings.map((w) => (
                    <div
                      key={w.id}
                      style={{
                        padding: '0.85rem',
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '14px',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: '#fde68a' }}>{w.title}</div>
                      <p style={{ margin: '0.25rem 0', color: '#e2e8f0', lineHeight: 1.45 }}>{w.message}</p>
                      <div style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', fontFamily: 'monospace' }}>
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
                <Bell size={16} color="var(--portal-cyan)" /> Clinic Announcements & Updates
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {notices.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--portal-text-dim)', fontSize: '0.8rem' }}>
                    No active company announcements.
                  </div>
                ) : (
                  notices.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        padding: '0.85rem 1rem',
                        background: 'rgba(7, 12, 24, 0.6)',
                        border: '1px solid var(--portal-card-border)',
                        borderRadius: '14px',
                        fontSize: '0.78rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: '#ffffff' }}>{n.title}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', fontFamily: 'monospace' }}>
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--portal-text-muted)', lineHeight: 1.45 }}>{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Employee Profile Card */}
            <div className="portal-section-card">
              <h3 className="portal-section-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.85rem' }}>
                <User size={16} color="var(--portal-cyan)" /> Your Employee Profile
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div style={{ background: 'rgba(7, 12, 24, 0.6)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', display: 'block' }}>Full Name</span>
                  <strong style={{ fontSize: '0.825rem', color: '#ffffff' }}>{employee.name}</strong>
                </div>

                <div style={{ background: 'rgba(7, 12, 24, 0.6)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', display: 'block' }}>Employee Code</span>
                  <strong style={{ fontSize: '0.825rem', color: 'var(--portal-cyan)', fontFamily: 'monospace' }}>{employee.employeeId}</strong>
                </div>

                <div style={{ background: 'rgba(7, 12, 24, 0.6)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', display: 'block' }}>Designation</span>
                  <strong style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>{employee.designation || 'Staff'}</strong>
                </div>

                <div style={{ background: 'rgba(7, 12, 24, 0.6)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', display: 'block' }}>Department</span>
                  <strong style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>{employee.department || 'Operations'}</strong>
                </div>

                <div style={{ background: 'rgba(7, 12, 24, 0.6)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', display: 'block' }}>Assigned Shift</span>
                  <strong style={{ fontSize: '0.825rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
                    {employee.shiftStartTime || '09:00'} - {employee.shiftEndTime || '18:00'}
                  </strong>
                </div>

                <div style={{ background: 'rgba(7, 12, 24, 0.6)', padding: '0.75rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--portal-text-dim)', display: 'block' }}>Registered WhatsApp</span>
                  <strong style={{ fontSize: '0.825rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
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
                <PlusCircle size={18} color="var(--portal-cyan)" />
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
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="portal-text-input"
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="PAID_LEAVE">Paid Leave</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="UNPAID_LEAVE">Unpaid Leave</option>
                </select>
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
                <label htmlFor="halfDayCheckbox" style={{ fontSize: '0.8rem', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}>
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

      {/* Modal: Request Shift Override */}
      {isShiftModalOpen && (
        <div className="portal-modal-backdrop">
          <div className="portal-modal-box">
            <div className="portal-modal-header">
              <h3 className="portal-modal-title">
                <Clock size={18} color="var(--portal-purple)" />
                <span>Request Shift Timing Change</span>
              </h3>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="portal-close-btn"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleShiftSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label className="portal-form-label">From Date</label>
                  <input
                    type="date"
                    required
                    value={shiftFrom}
                    onChange={(e) => {
                      setShiftFrom(e.target.value);
                      if (!shiftTo) setShiftTo(e.target.value);
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
                    value={shiftTo}
                    onChange={(e) => setShiftTo(e.target.value)}
                    className="portal-text-input"
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div>
                  <label className="portal-form-label">Shift Start Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="portal-text-input"
                    style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                </div>

                <div>
                  <label className="portal-form-label">Shift End Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 19:00"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="portal-text-input"
                    style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div>
                <label className="portal-form-label">Reason for Adjustment</label>
                <textarea
                  required
                  rows={3}
                  value={shiftReason}
                  onChange={(e) => setShiftReason(e.target.value)}
                  placeholder="Explain reason for timing change..."
                  className="portal-text-input"
                  style={{ fontSize: '0.85rem', resize: 'vertical' }}
                />
              </div>

              {shiftMsg && (
                <div className={shiftMsg.type === 'success' ? 'portal-alert-success' : 'portal-alert-error'}>
                  {shiftMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={shiftSubmitting}
                className="portal-btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                }}
              >
                {shiftSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                <span>Submit Shift Request</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
