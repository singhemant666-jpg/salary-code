'use client';

import React, { useState, useTransition } from 'react';
import {
  BroadcastNotice,
  EmployeeWarning,
  createBroadcastNotice,
  deleteBroadcastNotice,
  createEmployeeWarning,
  deleteEmployeeWarning,
} from '@/actions/portal-notices';
import {
  Bell,
  ShieldAlert,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  Info,
  CheckCircle,
} from 'lucide-react';

interface EmployeeOption {
  id: string;
  name: string;
  employeeId: string;
  department: string | null;
}

interface NoticesManagerClientProps {
  initialBroadcasts: BroadcastNotice[];
  initialWarnings: EmployeeWarning[];
  employees: EmployeeOption[];
}

export default function NoticesManagerClient({
  initialBroadcasts,
  initialWarnings,
  employees,
}: NoticesManagerClientProps) {
  const [broadcasts, setBroadcasts] = useState<BroadcastNotice[]>(initialBroadcasts);
  const [warnings, setWarnings] = useState<EmployeeWarning[]>(initialWarnings);
  const [activeTab, setActiveTab] = useState<'broadcasts' | 'warnings'>('broadcasts');
  const [isPending, startTransition] = useTransition();

  // New Broadcast Form State
  const [bcTitle, setBcTitle] = useState('');
  const [bcContent, setBcContent] = useState('');
  const [bcType, setBcType] = useState<'info' | 'warning' | 'alert' | 'success'>('info');
  const [bcLoading, setBcLoading] = useState(false);
  const [bcMsg, setBcMsg] = useState<string | null>(null);

  // New Warning Form State
  const [warnEmpId, setWarnEmpId] = useState(employees[0]?.id || '');
  const [warnTitle, setWarnTitle] = useState('');
  const [warnMessage, setWarnMessage] = useState('');
  const [warnSeverity, setWarnSeverity] = useState<'warning' | 'urgent' | 'info'>('warning');
  const [warnLoading, setWarnLoading] = useState(false);
  const [warnMsg, setWarnMsg] = useState<string | null>(null);

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bcTitle.trim() || !bcContent.trim()) return;

    setBcLoading(true);
    setBcMsg(null);
    try {
      const res = await createBroadcastNotice({
        title: bcTitle,
        content: bcContent,
        type: bcType,
      });
      if (res.success) {
        setBcTitle('');
        setBcContent('');
        setBcMsg('Announcement broadcasted to Employee Portal successfully!');
        setTimeout(() => setBcMsg(null), 3000);
        window.location.reload();
      } else {
        setBcMsg(res.message);
      }
    } finally {
      setBcLoading(false);
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast notice?')) return;
    startTransition(async () => {
      await deleteBroadcastNotice(id);
      setBroadcasts((prev) => prev.filter((b) => b.id !== id));
    });
  };

  const handleCreateWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warnEmpId || !warnTitle.trim() || !warnMessage.trim()) return;

    setWarnLoading(true);
    setWarnMsg(null);
    try {
      const res = await createEmployeeWarning({
        employeeId: warnEmpId,
        title: warnTitle,
        message: warnMessage,
        severity: warnSeverity,
      });
      if (res.success) {
        setWarnTitle('');
        setWarnMessage('');
        setWarnMsg('Warning/Notice issued directly to employee portal!');
        setTimeout(() => setWarnMsg(null), 3000);
        window.location.reload();
      } else {
        setWarnMsg(res.message);
      }
    } finally {
      setWarnLoading(false);
    }
  };

  const handleDeleteWarning = async (id: string) => {
    if (!confirm('Are you sure you want to clear/dismiss this warning?')) return;
    startTransition(async () => {
      await deleteEmployeeWarning(id);
      setWarnings((prev) => prev.filter((w) => w.id !== id));
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Portal Quick Link */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-cyan-400" />
            Portal Communications & Notices
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Broadcast clinic-wide updates or issue personal employee attendance/compliance warnings.
          </p>
        </div>

        <a
          href="/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 transition self-start sm:self-center"
        >
          <span>Open Mobile Portal (/portal)</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
            activeTab === 'broadcasts'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Broadcast Announcements ({broadcasts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warnings')}
          className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-2 transition ${
            activeTab === 'warnings'
              ? 'bg-amber-950 text-amber-300 border border-amber-800'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Employee Warnings & Alerts ({warnings.length})</span>
        </button>
      </div>

      {/* TAB 1: BROADCAST ANNOUNCEMENTS */}
      {activeTab === 'broadcasts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Announcement Form */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-400" /> New Broadcast Update
            </h3>

            <form onSubmit={handleCreateBroadcast} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diwali Clinic Timings"
                  value={bcTitle}
                  onChange={(e) => setBcTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Announcement Type / Style
                </label>
                <select
                  value={bcType}
                  onChange={(e) => setBcType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                >
                  <option value="info">General Info (Blue)</option>
                  <option value="warning">Notice / Warning (Amber)</option>
                  <option value="alert">Urgent Alert (Red)</option>
                  <option value="success">Greetings / Celebration (Emerald)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Announcement Content / Message
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the full update message..."
                  value={bcContent}
                  onChange={(e) => setBcContent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              {bcMsg && (
                <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded-xl text-xs">
                  {bcMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={bcLoading}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-cyan-950/40"
              >
                {bcLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                <span>Publish to Employee Portal</span>
              </button>
            </form>
          </div>

          {/* List of Active Broadcasts */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Active Broadcasts on Portal
            </h3>

            {broadcasts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl">
                No active announcements published. Use the form to publish one.
              </div>
            ) : (
              broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{b.title}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                        {b.type}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{b.content}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteBroadcast(b.id)}
                    title="Delete notice"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL EMPLOYEE WARNINGS */}
      {activeTab === 'warnings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Issue Warning Form */}
          <div className="lg:col-span-1 bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 h-fit">
            <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" /> Issue Employee Warning
            </h3>

            <form onSubmit={handleCreateWarning} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Select Employee
                </label>
                <select
                  value={warnEmpId}
                  onChange={(e) => setWarnEmpId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeId}) - {emp.department || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Warning Title / Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consecutive Late Arrival Alert"
                  value={warnTitle}
                  onChange={(e) => setWarnTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Severity Level
                </label>
                <select
                  value={warnSeverity}
                  onChange={(e) => setWarnSeverity(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="warning">Warning (Amber Alert)</option>
                  <option value="urgent">Urgent / Strict Warning (Red Alert)</option>
                  <option value="info">Advisory / Compliance Note (Blue)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Explanation / Directives
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Please be informed that you have logged in late 3 days in a row..."
                  value={warnMessage}
                  onChange={(e) => setWarnMessage(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {warnMsg && (
                <div className="p-3 bg-amber-950/80 border border-amber-800 text-amber-300 rounded-xl text-xs">
                  {warnMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={warnLoading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-950/40"
              >
                {warnLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                <span>Send Warning to Employee Portal</span>
              </button>
            </form>
          </div>

          {/* List of Active Employee Warnings */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Issued Employee Warnings
            </h3>

            {warnings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/40 border border-slate-800 rounded-2xl">
                No active employee warnings.
              </div>
            ) : (
              warnings.map((w) => (
                <div
                  key={w.id}
                  className={`bg-slate-900/60 border rounded-2xl p-4 flex items-start justify-between gap-4 ${
                    w.severity === 'urgent' ? 'border-rose-900/60' : 'border-amber-900/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{w.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 text-slate-300 border border-slate-800">
                        {w.employeeName} ({w.employeeCode})
                      </span>
                      <span
                        className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                          w.severity === 'urgent'
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {w.severity}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(w.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{w.message}</p>
                  </div>

                  <button
                    onClick={() => handleDeleteWarning(w.id)}
                    title="Clear/Dismiss warning"
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/40 border border-transparent hover:border-emerald-900/50 transition shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
