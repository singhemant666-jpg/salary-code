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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1000px' }}>
      {/* Header Bar with Portal Quick Link */}
      <div
        className="glass-card-static"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={20} color="#06b6d4" />
            Portal Communications & Notices
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            Broadcast clinic-wide updates or issue personal employee attendance/compliance warnings.
          </p>
        </div>

        <a
          href="/portal"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textDecoration: 'none' }}
        >
          <span>Open Mobile Portal (/portal)</span>
          <ExternalLink size={14} />
        </a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('broadcasts')}
          className={`btn ${activeTab === 'broadcasts' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <Bell size={15} />
          <span>Broadcast Announcements ({broadcasts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('warnings')}
          className={`btn ${activeTab === 'warnings' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
        >
          <ShieldAlert size={15} />
          <span>Employee Warnings & Alerts ({warnings.length})</span>
        </button>
      </div>

      {/* TAB 1: BROADCAST ANNOUNCEMENTS */}
      {activeTab === 'broadcasts' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Create Announcement Form */}
          <div className="glass-card-static" style={{ height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} color="#06b6d4" /> New Broadcast Update
            </h3>

            <form onSubmit={handleCreateBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Announcement Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinic Holiday Timings"
                  value={bcTitle}
                  onChange={(e) => setBcTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Announcement Style / Type</label>
                <select
                  value={bcType}
                  onChange={(e) => setBcType(e.target.value as any)}
                  className="form-input"
                >
                  <option value="info">General Info (Blue)</option>
                  <option value="warning">Notice / Warning (Amber)</option>
                  <option value="alert">Urgent Alert (Red)</option>
                  <option value="success">Greetings / Celebration (Green)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Announcement Content</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Write the full update message..."
                  value={bcContent}
                  onChange={(e) => setBcContent(e.target.value)}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {bcMsg && (
                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#67e8f9', fontSize: '0.8rem' }}>
                  {bcMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={bcLoading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {bcLoading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
                <span>Publish to Employee Portal</span>
              </button>
            </form>
          </div>

          {/* List of Active Broadcasts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Broadcasts on Portal
            </h3>

            {broadcasts.length === 0 ? (
              <div className="glass-card-static" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No active announcements published. Use the form to publish one.
              </div>
            ) : (
              broadcasts.map((b) => (
                <div
                  key={b.id}
                  className="glass-card-static"
                  style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', padding: '1rem' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{b.title}</strong>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {b.type.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {new Date(b.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {b.content}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteBroadcast(b.id)}
                    title="Delete notice"
                    className="btn btn-danger"
                    style={{ padding: '0.45rem', flexShrink: 0 }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PERSONAL EMPLOYEE WARNINGS */}
      {activeTab === 'warnings' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Issue Warning Form */}
          <div className="glass-card-static" style={{ height: 'fit-content' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f59e0b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldAlert size={16} color="#f59e0b" /> Issue Employee Warning
            </h3>

            <form onSubmit={handleCreateWarning} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Employee</label>
                <select
                  value={warnEmpId}
                  onChange={(e) => setWarnEmpId(e.target.value)}
                  className="form-input"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeId}) - {emp.department || 'Staff'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Warning Title / Subject</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Consecutive Late Arrival Alert"
                  value={warnTitle}
                  onChange={(e) => setWarnTitle(e.target.value)}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Severity Level</label>
                <select
                  value={warnSeverity}
                  onChange={(e) => setWarnSeverity(e.target.value as any)}
                  className="form-input"
                >
                  <option value="warning">Warning (Amber Alert)</option>
                  <option value="urgent">Urgent / Strict Warning (Red Alert)</option>
                  <option value="info">Advisory / Compliance Note (Blue)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Explanation / Directives</label>
                <textarea
                  required
                  rows={4}
                  placeholder="e.g. Please be informed that you have logged in late 3 days in a row..."
                  value={warnMessage}
                  onChange={(e) => setWarnMessage(e.target.value)}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                />
              </div>

              {warnMsg && (
                <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#fde68a', fontSize: '0.8rem' }}>
                  {warnMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={warnLoading}
                className="btn btn-warning"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {warnLoading ? <Loader2 size={15} className="animate-spin" /> : <ShieldAlert size={15} />}
                <span>Send Warning to Employee Portal</span>
              </button>
            </form>
          </div>

          {/* List of Issued Warnings */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Issued Employee Warnings
            </h3>

            {warnings.length === 0 ? (
              <div className="glass-card-static" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                No active employee warnings.
              </div>
            ) : (
              warnings.map((w) => (
                <div
                  key={w.id}
                  className="glass-card-static"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    padding: '1rem',
                    borderColor: w.severity === 'urgent' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>{w.title}</strong>
                      <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                        {w.employeeName} ({w.employeeCode})
                      </span>
                      <span className={`badge ${w.severity === 'urgent' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.65rem' }}>
                        {w.severity.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {new Date(w.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                      {w.message}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteWarning(w.id)}
                    title="Clear/Dismiss warning"
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem', flexShrink: 0 }}
                  >
                    <Trash2 size={15} />
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
