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
  AlertTriangle,
  Bell,
  CheckCircle2,
  XCircle,
  Clock4,
  PlusCircle,
  Download,
  CalendarCheck,
  Building2,
  Briefcase,
  ChevronRight,
  ShieldAlert,
  Info,
  ChevronDown,
  X,
  Send,
  Loader2,
} from 'lucide-react';

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
          // Refresh data
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
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col pb-24 selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30 border border-cyan-400/20 shrink-0">
              <span className="text-white font-extrabold text-sm">MPC</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight sm:text-base">
                  {employee.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800/60">
                  {employee.employeeId}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {employee.designation || 'Staff'} • {employee.department || 'Clinic'}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition active:scale-95"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto px-4 py-4 space-y-4">
        {/* Active Employee Personal Warnings / Urgent Notice */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w) => (
              <div
                key={w.id}
                className={`p-4 rounded-2xl border flex items-start gap-3 shadow-lg ${
                  w.severity === 'urgent'
                    ? 'bg-rose-950/40 border-rose-700/60 text-rose-200'
                    : 'bg-amber-950/40 border-amber-700/60 text-amber-200'
                }`}
              >
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
                <div className="text-xs">
                  <div className="font-bold flex items-center gap-2 text-sm">
                    <span>{w.title}</span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/30">
                      {w.severity}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-200">{w.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Company Broadcast Announcement Banner */}
        {notices.length > 0 && (
          <div className="p-3.5 bg-gradient-to-r from-blue-950/50 via-slate-900/60 to-cyan-950/50 border border-cyan-800/40 rounded-2xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <Bell className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="truncate">
                <span className="font-semibold text-white">{notices[0].title}: </span>
                <span className="text-slate-300">{notices[0].content}</span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('notices')}
              className="text-[11px] text-cyan-400 font-semibold hover:underline shrink-0 flex items-center"
            >
              View All <ChevronRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        )}

        {/* TAB 1: ATTENDANCE */}
        {activeTab === 'attendance' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Month & Year Bar */}
            <div className="flex items-center justify-between bg-slate-900/70 border border-slate-800 rounded-2xl p-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
                  Attendance Period
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => handleMonthChange(Number(e.target.value), selectedYear)}
                  className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value={10}>October</option>
                  <option value={11}>November</option>
                  <option value={12}>December</option>
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => handleMonthChange(selectedMonth, Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>
            </div>

            {/* Monthly Summary Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-900/80 border border-emerald-900/30 rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Present Days
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {summary.presentDays}{' '}
                  <span className="text-xs font-normal text-slate-400">/ {summary.totalDays}</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  +{summary.halfDays} half days
                </div>
              </div>

              <div className="bg-slate-900/80 border border-rose-900/30 rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                  Absent / LOP
                </div>
                <div className="text-xl font-bold text-rose-300 mt-1">
                  {summary.absentDays + summary.unpaidLeaves}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {summary.paidLeaves > 0 ? `${summary.paidLeaves} Paid Leaves` : 'No paid leaves'}
                </div>
              </div>

              <div className="bg-slate-900/80 border border-cyan-900/30 rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider">
                  Hours Worked
                </div>
                <div className="text-xl font-bold text-white mt-1">
                  {summary.totalHoursWorked}
                  <span className="text-xs font-normal text-slate-400"> hrs</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  OT: {summary.totalOvertimeHours} hrs
                </div>
              </div>

              <div className="bg-slate-900/80 border border-amber-900/30 rounded-2xl p-3 shadow-sm">
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                  Late Arrivals
                </div>
                <div className="text-xl font-bold text-amber-300 mt-1">
                  {summary.lateCount}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {summary.totalLateMinutes} total mins
                </div>
              </div>
            </div>

            {/* Daily Punch Logs */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Daily Attendance & Punch Records
                </h3>
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />}
              </div>

              <div className="space-y-2">
                {attendance.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No attendance records for {summary.monthName} {summary.year}.
                  </div>
                ) : (
                  attendance.map((day) => {
                    const isPresent = day.status === 'PRESENT';
                    const isHalf = day.status === 'HALF_DAY';
                    const isAbsent = day.status === 'ABSENT';
                    const isOff = day.status === 'WEEKLY_OFF';
                    const isLeave = day.status === 'PAID_LEAVE' || day.status === 'UNPAID_LEAVE';

                    let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                    if (isPresent) badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60';
                    if (isHalf) badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-800/60';
                    if (isAbsent) badgeColor = 'bg-rose-950/80 text-rose-300 border-rose-800/60';
                    if (isLeave) badgeColor = 'bg-blue-950/80 text-blue-300 border-blue-800/60';
                    if (isOff) badgeColor = 'bg-slate-900 text-slate-400 border-slate-800';

                    return (
                      <div
                        key={day.id || day.dateStr}
                        className="bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition"
                      >
                        <div className="flex items-center justify-between sm:justify-start gap-3">
                          <span className="font-mono text-xs font-semibold text-slate-200">
                            {day.dayDisplay}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${badgeColor}`}
                          >
                            {day.status.replace('_', ' ')}
                          </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs">
                          {/* Punches */}
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">In</span>
                              <span
                                className={`font-mono font-medium ${
                                  day.firstIn ? 'text-emerald-400' : 'text-slate-600'
                                }`}
                              >
                                {day.firstIn || '--:--'}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">Out</span>
                              <span
                                className={`font-mono font-medium ${
                                  day.lastOut ? 'text-rose-400' : 'text-slate-600'
                                }`}
                              >
                                {day.lastOut || '--:--'}
                              </span>
                            </div>

                            <div className="text-right min-w-[55px]">
                              <span className="text-[10px] text-slate-500 block">Worked</span>
                              <span className="font-mono font-semibold text-cyan-300">
                                {day.workingHours > 0 ? `${day.workingHours.toFixed(2)}h` : '--'}
                              </span>
                            </div>
                          </div>

                          {/* Late or remarks flag */}
                          {day.lateMinutes > 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/50">
                              {day.lateMinutes}m late
                            </span>
                          )}
                        </div>

                        {/* Optional Remarks */}
                        {day.remarks && (
                          <div className="text-[10px] text-slate-400 bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-800/50 sm:hidden">
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

        {/* TAB 2: LEAVES & SHIFT OVERRIDES */}
        {activeTab === 'leaves' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Actions Header */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setIsLeaveModalOpen(true)}
                className="py-3 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-2xl shadow-lg shadow-blue-950/40 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Apply for Leave</span>
              </button>

              <button
                onClick={() => setIsShiftModalOpen(true)}
                className="py-3 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl shadow-lg shadow-purple-950/40 text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Clock className="w-4 h-4" />
                <span>Request Shift Change</span>
              </button>
            </div>

            {/* Leave Applications History */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 px-1">
                Your Leave Applications ({leaves.length})
              </h3>

              <div className="space-y-2.5">
                {leaves.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500">
                    No leave requests submitted yet.
                  </div>
                ) : (
                  leaves.map((l) => (
                    <div
                      key={l.id}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">
                            {l.leaveType.replace('_', ' ')}
                          </span>
                          {l.isHalfDay && (
                            <span className="text-[10px] font-medium bg-amber-950/60 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/40">
                              Half Day ({l.halfDayType?.replace('_', ' ') || 'Part'})
                            </span>
                          )}
                        </div>

                        {l.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                            <CheckCircle2 className="w-3 h-3" /> APPROVED
                          </span>
                        )}
                        {l.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-700/60">
                            <Clock4 className="w-3 h-3" /> PENDING
                          </span>
                        )}
                        {l.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700/60">
                            <XCircle className="w-3 h-3" /> REJECTED
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                        <CalendarCheck className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          {l.fromDateStr} to {l.toDateStr}
                        </span>
                      </div>

                      {l.reason && (
                        <p className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl border border-slate-800/50">
                          &ldquo;{l.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Shift Override Requests */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 px-1">
                Shift Timing Change Requests ({shiftOverrides.length})
              </h3>

              <div className="space-y-2.5">
                {shiftOverrides.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No custom shift requests.
                  </div>
                ) : (
                  shiftOverrides.map((s) => (
                    <div
                      key={s.id}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-white">
                          Shift: <span className="text-cyan-300 font-mono">{s.shiftStartTime} - {s.shiftEndTime}</span>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            s.status === 'APPROVED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                              : s.status === 'REJECTED'
                              ? 'bg-rose-950 text-rose-300 border-rose-700/60'
                              : 'bg-amber-950 text-amber-300 border-amber-700/60'
                          }`}
                        >
                          {s.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 font-mono">
                        Period: {s.fromDateStr} to {s.toDateStr}
                      </div>

                      {s.reason && (
                        <p className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-xl">
                          {s.reason}
                        </p>
                      )}

                      {s.rejectionReason && (
                        <div className="text-xs text-rose-300 bg-rose-950/40 p-2 rounded-xl border border-rose-800/40">
                          Rejection Reason: {s.rejectionReason}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SALARY SLIPS */}
        {activeTab === 'slips' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Official Salary Slips
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Verified payslips available for direct mobile download
                  </p>
                </div>
                <FileText className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="space-y-3">
                {salarySlips.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No finalized salary slips published yet.
                  </div>
                ) : (
                  salarySlips.map((slip) => (
                    <div
                      key={slip.id}
                      className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{slip.periodName}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50">
                            {slip.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-3">
                          <span>Present: <strong className="text-slate-200">{slip.presentDays}d</strong></span>
                          <span>LOP: <strong className="text-rose-400">{slip.lopDays}d</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-0 border-slate-800/80">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                            Net Take Home
                          </span>
                          <span className="text-base font-extrabold text-emerald-400 font-mono">
                            {formatCurrency(slip.netSalary)}
                          </span>
                        </div>

                        <a
                          href={slip.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-950/40 active:scale-95 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
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

        {/* TAB 4: NOTICES & PROFILE */}
        {activeTab === 'notices' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Warnings list */}
            {warnings.length > 0 && (
              <div className="bg-slate-900/60 border border-amber-800/50 rounded-3xl p-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" /> Personal Warnings & Directives
                </h3>
                <div className="space-y-2.5">
                  {warnings.map((w) => (
                    <div
                      key={w.id}
                      className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-2xl text-xs space-y-1"
                    >
                      <div className="font-bold text-amber-200">{w.title}</div>
                      <p className="text-slate-300 leading-relaxed">{w.message}</p>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Issued: {new Date(w.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Broadcast Updates */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-cyan-400" /> Clinic Announcements & Updates
              </h3>

              <div className="space-y-3">
                {notices.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    No active company announcements.
                  </div>
                ) : (
                  notices.map((n) => (
                    <div
                      key={n.id}
                      className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white">{n.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(n.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Employee Profile Card */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-cyan-400" /> Your Employee Profile
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Full Name</span>
                  <span className="font-semibold text-white">{employee.name}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Employee Code</span>
                  <span className="font-mono font-semibold text-cyan-300">{employee.employeeId}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Designation</span>
                  <span className="text-slate-200">{employee.designation || 'Staff'}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Department</span>
                  <span className="text-slate-200">{employee.department || 'Operations'}</span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Assigned Shift</span>
                  <span className="font-mono text-slate-200">
                    {employee.shiftStartTime || '09:00'} - {employee.shiftEndTime || '18:00'}
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Registered WhatsApp</span>
                  <span className="font-mono text-slate-200">
                    {employee.mobile ? `+91 ${employee.mobile.slice(-10)}` : 'Not Set'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 px-3 py-2">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`py-2 px-1 flex flex-col items-center gap-1 rounded-2xl transition ${
              activeTab === 'attendance'
                ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('leaves')}
            className={`py-2 px-1 flex flex-col items-center gap-1 rounded-2xl transition ${
              activeTab === 'leaves'
                ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Leaves</span>
          </button>

          <button
            onClick={() => setActiveTab('slips')}
            className={`py-2 px-1 flex flex-col items-center gap-1 rounded-2xl transition ${
              activeTab === 'slips'
                ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Salary Slips</span>
          </button>

          <button
            onClick={() => setActiveTab('notices')}
            className={`py-2 px-1 flex flex-col items-center gap-1 rounded-2xl relative transition ${
              activeTab === 'notices'
                ? 'text-cyan-400 bg-cyan-950/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bell className="w-5 h-5" />
            <span className="text-[10px] tracking-tight">Updates</span>
            {(warnings.length > 0 || notices.length > 0) && (
              <span className="absolute top-1.5 right-6 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-950" />
            )}
          </button>
        </div>
      </nav>

      {/* Modal: Apply for Leave */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-cyan-400" /> Apply for Leave
              </h3>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Leave Type
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="CASUAL_LEAVE">Casual Leave</option>
                  <option value="PAID_LEAVE">Paid Leave</option>
                  <option value="SICK_LEAVE">Sick Leave</option>
                  <option value="UNPAID_LEAVE">Unpaid Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveFrom}
                    onChange={(e) => {
                      setLeaveFrom(e.target.value);
                      if (!leaveTo) setLeaveTo(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    required
                    value={leaveTo}
                    onChange={(e) => setLeaveTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="halfDayCheckbox"
                  checked={isHalfDay}
                  onChange={(e) => setIsHalfDay(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-600 focus:ring-cyan-500 w-4 h-4 bg-slate-950"
                />
                <label htmlFor="halfDayCheckbox" className="text-xs text-slate-300 font-medium">
                  This is a Half-Day Leave
                </label>
              </div>

              {isHalfDay && (
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Half-Day Timing Slot
                  </label>
                  <select
                    value={halfDayType}
                    onChange={(e) => setHalfDayType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2 text-white"
                  >
                    <option value="FIRST_HALF">First Half (Morning)</option>
                    <option value="SECOND_HALF">Second Half (Afternoon/Evening)</option>
                  </select>
                </div>
              )}

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Reason / Purpose of Leave
                </label>
                <textarea
                  required
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="Explain reason for leave..."
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {leaveMsg && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    leaveMsg.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {leaveMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={leaveSubmitting}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50"
              >
                {leaveSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Submit Leave Application</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Request Shift Override */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-400" /> Request Shift Timing Change
              </h3>
              <button
                onClick={() => setIsShiftModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleShiftSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    required
                    value={shiftFrom}
                    onChange={(e) => {
                      setShiftFrom(e.target.value);
                      if (!shiftTo) setShiftTo(e.target.value);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    required
                    value={shiftTo}
                    onChange={(e) => setShiftTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Desired Shift Start
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Desired Shift End
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 19:00"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Reason for Timing Adjustment
                </label>
                <textarea
                  required
                  rows={3}
                  value={shiftReason}
                  onChange={(e) => setShiftReason(e.target.value)}
                  placeholder="Reason for changing shift timing..."
                  className="w-full bg-slate-950 border border-slate-700 text-xs rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {shiftMsg && (
                <div
                  className={`p-3 rounded-xl text-xs ${
                    shiftMsg.type === 'success'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                  }`}
                >
                  {shiftMsg.text}
                </div>
              )}

              <button
                type="submit"
                disabled={shiftSubmitting}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-950/40 disabled:opacity-50"
              >
                {shiftSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Submit Shift Request</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
