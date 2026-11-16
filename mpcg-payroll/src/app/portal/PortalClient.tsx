'use client';

import React, { useState, useTransition } from 'react';
import {
  PortalAttendanceDay,
  PortalAttendanceSummary,
  PortalSalarySlipItem,
  getPortalDashboardData,
  submitPortalLeave,
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
                  {summary.presentDays} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>/ {summary.totalDays}</span>
                </div>
                <div className="portal-stat-sub">+{summary.halfDays} half days</div>
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
                  OT: {summary.totalOvertimeHours} hrs
                  {summary.totalShortHours > 0 ? ` • Short: ${summary.totalShortHours} hrs` : ''}
                </div>
              </div>

              <div className="portal-stat-card">
                <div className="portal-stat-label" style={{ color: '#d97706' }}>Late Arrivals</div>
                <div className="portal-stat-value" style={{ color: '#b45309' }}>
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
                    if (day.status === 'PRESENT') badgeClass = 'portal-badge-present';
                    if (day.status === 'HALF_DAY') badgeClass = 'portal-badge-half';
                    if (day.status === 'ABSENT') badgeClass = 'portal-badge-absent';
                    if (day.status === 'PAID_LEAVE' || day.status === 'UNPAID_LEAVE') badgeClass = 'portal-badge-leave';

                    return (
                      <div key={day.id || day.dateStr} className="portal-day-row">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span className="portal-day-date">{day.dayDisplay}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span className={`portal-badge ${badgeClass}`}>
                              {day.status.replace('_', ' ')}
                            </span>
                            {day.overtimeDisplay && (
                              <span
                                className="portal-badge"
                                style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}
                              >
                                +{day.overtimeDisplay} OT
                              </span>
                            )}
                            {day.shortHoursDisplay && (
                              <span
                                className="portal-badge"
                                style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}
                              >
                                -{day.shortHoursDisplay} Short
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <div className="portal-punch-group">
                            <div className="portal-punch-item">
                              <span className="portal-punch-label">In</span>
                              <span
                                className="portal-punch-time"
                                style={{ color: day.firstIn ? '#059669' : '#94a3b8' }}
                              >
                                {day.firstIn || '--:--'}
                              </span>
                            </div>

                            <div className="portal-punch-item">
                              <span className="portal-punch-label">Out</span>
                              <span
                                className="portal-punch-time"
                                style={{ color: day.lastOut ? '#e11d48' : '#94a3b8' }}
                              >
                                {day.lastOut || '--:--'}
                              </span>
                            </div>

                            <div className="portal-punch-item" style={{ minWidth: '48px' }}>
                              <span className="portal-punch-label">Worked</span>
                              <span className="portal-punch-time" style={{ color: '#0f172a' }}>
                                {day.workingHoursDisplay || (day.workingHours > 0 ? `${day.workingHours.toFixed(2)}h` : '--')}
                              </span>
                            </div>

                            <div className="portal-punch-item" style={{ minWidth: '55px' }}>
                              <span className="portal-punch-label">
                                {day.overtimeDisplay ? 'Overtime' : day.shortHoursDisplay ? 'Short' : 'OT / Short'}
                              </span>
                              {day.overtimeDisplay ? (
                                <span className="portal-punch-time" style={{ color: '#047857', fontWeight: 800 }}>
                                  +{day.overtimeDisplay}
                                </span>
                              ) : day.shortHoursDisplay ? (
                                <span className="portal-punch-time" style={{ color: '#b45309', fontWeight: 800 }}>
                                  -{day.shortHoursDisplay}
                                </span>
                              ) : (
                                <span className="portal-punch-time" style={{ color: '#94a3b8' }}>
                                  --
                                </span>
                              )}
                            </div>
                          </div>

                          {day.lateMinutes > 0 && (
                            <span
                              style={{
                                padding: '0.15rem 0.45rem',
                                borderRadius: '6px',
                                fontSize: '0.68rem',
                                fontFamily: 'monospace',
                                background: '#fffbeb',
                                color: '#b45309',
                                border: '1px solid #fde68a',
                                fontWeight: 700,
                              }}
                            >
                              {day.lateMinutes}m late
                            </span>
                          )}
                        </div>

                        {day.remarks && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '0.35rem 0.5rem', borderRadius: '8px' }}>
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
                        gap: '0.75rem',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
                            {slip.periodName}
                          </span>
                          <span className="portal-badge portal-badge-present">
                            {slip.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: '8px' }}>
                          <span>Pres: <strong style={{ color: '#0f172a' }}>{slip.presentDays}d</strong></span>
                          <span>LOP: <strong style={{ color: '#be123c' }}>{slip.lopDays}d</strong></span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingTop: '0.65rem',
                          borderTop: '1px solid #f1f5f9',
                        }}
                      >
                        <div>
                          <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block' }}>
                            Net Take Home
                          </span>
                          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                            {formatCurrency(slip.netSalary)}
                          </span>
                        </div>

                        <a
                          href={slip.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="portal-btn-primary"
                          style={{ width: 'auto', padding: '0.55rem 0.95rem', fontSize: '0.78rem', textDecoration: 'none' }}
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
    </div>
  );
}
