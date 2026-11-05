'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Filter,
  Download,
  Eye,
  X,
  Copy,
  Check,
  Calendar,
  User,
  Activity,
  Layers,
  ArrowRight,
  ShieldAlert,
  Globe,
  FileText,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Fingerprint,
  ShieldCheck,
  Mail,
  Tag,
  Sliders,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Shield,
  KeyRound,
} from 'lucide-react';

export interface AuditRecord {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: string; // ISO string
}

interface AuditLogClientProps {
  initialLogs: AuditRecord[];
  totalCount: number;
}

export interface ParsedActor {
  name: string;
  email: string | null;
  role: string | null;
  initials: string;
  isSystem: boolean;
}

/**
 * Parses user identity string like:
 * "Super Admin <admin@mpcglobal.com> [SUPER_ADMIN]"
 */
export function parseActorIdentity(raw: string | null): ParsedActor {
  if (!raw || raw.toLowerCase().includes('system') || raw.toLowerCase().includes('automated')) {
    return {
      name: raw || 'System Automated',
      email: null,
      role: 'SYSTEM',
      initials: 'SYS',
      isSystem: true,
    };
  }

  const emailMatch = raw.match(/<([^>]+)>/);
  const roleMatch = raw.match(/\[([^\]]+)\]/);

  let name = raw;
  if (emailMatch) {
    name = name.replace(emailMatch[0], '');
  }
  if (roleMatch) {
    name = name.replace(roleMatch[0], '');
  }
  name = name.trim();

  const email = emailMatch ? emailMatch[1].trim() : null;
  const role = roleMatch ? roleMatch[1].trim() : 'ADMIN';

  const nameParts = (name || 'Admin').split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
      : (name.slice(0, 2) || 'AD').toUpperCase();

  return {
    name: name || 'Admin',
    email,
    role,
    initials,
    isSystem: false,
  };
}

import {
  FIELD_NAME_MAP,
  humanizeFieldName,
  formatValueForDisplay,
  formatReasonText,
} from '@/lib/audit-utils';

export { FIELD_NAME_MAP, humanizeFieldName, formatValueForDisplay, formatReasonText };

export interface DetailedDiff {
  key: string;
  humanKey: string;
  oldVal: any;
  newVal: any;
  isAdded: boolean;
  isRemoved: boolean;
  isChanged: boolean;
}

export function getDetailedDiffs(oldValStr: string | null, newValStr: string | null): DetailedDiff[] {
  const parseSafe = (s: string | null) => {
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return s;
    }
  };

  const oldObj = parseSafe(oldValStr);
  const newObj = parseSafe(newValStr);

  const isOldObj = oldObj && typeof oldObj === 'object' && !Array.isArray(oldObj);
  const isNewObj = newObj && typeof newObj === 'object' && !Array.isArray(newObj);

  if (!isOldObj && !isNewObj) {
    if (oldValStr || newValStr) {
      if (oldValStr !== newValStr) {
        return [
          {
            key: 'payload',
            humanKey: 'Payload Content',
            oldVal: oldValStr,
            newVal: newValStr,
            isAdded: !oldValStr && !!newValStr,
            isRemoved: !!oldValStr && !newValStr,
            isChanged: true,
          },
        ];
      }
    }
    return [];
  }

  const allKeys = Array.from(
    new Set([
      ...Object.keys(isOldObj ? oldObj : {}),
      ...Object.keys(isNewObj ? newObj : {}),
    ])
  ).sort();

  return allKeys.map((key) => {
    const vOld = isOldObj ? (oldObj as any)[key] : undefined;
    const vNew = isNewObj ? (newObj as any)[key] : undefined;

    const strOld = vOld === undefined ? undefined : JSON.stringify(vOld);
    const strNew = vNew === undefined ? undefined : JSON.stringify(vNew);

    const isAdded = vOld === undefined && vNew !== undefined;
    const isRemoved = vOld !== undefined && vNew === undefined;
    const isChanged = strOld !== strNew;

    return {
      key,
      humanKey: humanizeFieldName(key),
      oldVal: vOld,
      newVal: vNew,
      isAdded,
      isRemoved,
      isChanged,
    };
  });
}

export default function AuditLogClient({ initialLogs, totalCount }: AuditLogClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectedLog, setInspectedLog] = useState<AuditRecord | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'diff' | 'new' | 'old' | 'raw'>('diff');
  const [diffOnlyFilter, setDiffOnlyFilter] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling and close on Escape
  useEffect(() => {
    if (!inspectedLog) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setInspectedLog(null);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [inspectedLog]);

  // Distinct entities and actions from data
  const availableEntities = useMemo(() => {
    const set = new Set<string>();
    initialLogs.forEach((l) => {
      if (l.entity) set.add(l.entity);
    });
    return Array.from(set).sort();
  }, [initialLogs]);

  const availableActions = useMemo(() => {
    const set = new Set<string>();
    initialLogs.forEach((l) => {
      if (l.action) set.add(l.action);
    });
    return Array.from(set).sort();
  }, [initialLogs]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Date filtering logic
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  // Filter logs
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }
      if (selectedEntity !== 'ALL' && log.entity !== selectedEntity) {
        return false;
      }
      if (dateFilter !== 'ALL') {
        const logTime = new Date(log.createdAt).getTime();
        if (dateFilter === 'TODAY' && logTime < startOfToday) return false;
        if (dateFilter === 'WEEK' && logTime < sevenDaysAgo) return false;
        if (dateFilter === 'MONTH' && logTime < thirtyDaysAgo) return false;
      }

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesUser = (log.userName || '').toLowerCase().includes(q);
        const matchesAction = (log.action || '').toLowerCase().includes(q);
        const matchesEntity = (log.entity || '').toLowerCase().includes(q);
        const matchesEntityId = (log.entityId || '').toLowerCase().includes(q);
        const matchesReason = (log.reason || '').toLowerCase().includes(q) || formatReasonText(log.reason).toLowerCase().includes(q);
        const matchesIp = (log.ipAddress || '').toLowerCase().includes(q);
        const matchesOld = (log.oldValue || '').toLowerCase().includes(q);
        const matchesNew = (log.newValue || '').toLowerCase().includes(q);

        if (
          !matchesUser &&
          !matchesAction &&
          !matchesEntity &&
          !matchesEntityId &&
          !matchesReason &&
          !matchesIp &&
          !matchesOld &&
          !matchesNew
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialLogs, selectedAction, selectedEntity, dateFilter, searchTerm, startOfToday, sevenDaysAgo, thirtyDaysAgo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  // Statistics calculation
  const stats = useMemo(() => {
    let todayCount = 0;
    let updatesCount = 0;
    let deletesCount = 0;
    let slipsCount = 0;

    initialLogs.forEach((l) => {
      const t = new Date(l.createdAt).getTime();
      if (t >= startOfToday) todayCount++;
      if (l.action === 'UPDATE') updatesCount++;
      if (l.action === 'DELETE') deletesCount++;
      if (l.action === 'GENERATE' || l.entity === 'SalarySlip') slipsCount++;
    });

    return {
      total: totalCount,
      today: todayCount,
      updates: updatesCount,
      deletes: deletesCount,
      slips: slipsCount,
    };
  }, [initialLogs, totalCount, startOfToday]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Log ID',
      'Date & Time (IST)',
      'Action',
      'Entity',
      'Entity ID',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'User ID',
      'IP Address',
      'Reason / Description',
      'Old Value',
      'New Value',
    ];

    const escapeCSV = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = filteredLogs.map((log) => {
      const dateFormatted = new Date(log.createdAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
      });
      const actor = parseActorIdentity(log.userName);
      return [
        escapeCSV(log.id),
        escapeCSV(dateFormatted),
        escapeCSV(log.action),
        escapeCSV(log.entity),
        escapeCSV(log.entityId || ''),
        escapeCSV(actor.name),
        escapeCSV(actor.email || ''),
        escapeCSV(actor.role || ''),
        escapeCSV(log.userId || ''),
        escapeCSV(log.ipAddress || ''),
        escapeCSV(log.reason || ''),
        escapeCSV(log.oldValue || ''),
        escapeCSV(log.newValue || ''),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mpcg_audit_trail_forensic_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to parse JSON safely
  const parseSafeJson = (str: string | null) => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return str;
    }
  };

  // Action badge color styling
  const getActionBadgeClass = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'badge-success';
      case 'UPDATE':
        return 'badge-info';
      case 'DELETE':
        return 'badge-error';
      case 'APPROVE':
        return 'badge-approved';
      case 'FINALIZE':
        return 'badge-finalized';
      case 'REOPEN':
      case 'REJECT':
        return 'badge-warning';
      case 'GENERATE':
        return 'badge-purple';
      case 'APPLY':
        return 'badge-sky';
      default:
        return 'badge-neutral';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '0.25rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
            <ShieldCheck className="h-6 w-6" style={{ color: '#818cf8' }} />
            <span>Audit Log</span>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                color: '#a5b4fc',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                letterSpacing: '0.03em',
              }}
            >
              System Activity
            </span>
          </h1>
          <p className="page-subtitle" style={{ fontSize: '0.84rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            Chronological record of administrative actions, payroll updates, employee profile modifications, and system events.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.82rem', height: '38px', borderRadius: '8px' }}
          >
            <Download className="h-4 w-4" />
            <span>Export CSV</span>
            <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1' }}>
              {filteredLogs.length}
            </span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem' }}>
        {/* Total Entries */}
        <div
          className="stat-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid var(--border-secondary, rgba(255, 255, 255, 0.08))',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              padding: '0.65rem',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: '#a5b4fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Layers size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Logged Events</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginTop: '0.15rem' }}>{stats.total.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Today's Activity */}
        <div
          className="stat-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid var(--border-secondary, rgba(255, 255, 255, 0.08))',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              padding: '0.65rem',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today&apos;s Events</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginTop: '0.15rem' }}>{stats.today.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Profile & Deduction Edits */}
        <div
          className="stat-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid var(--border-secondary, rgba(255, 255, 255, 0.08))',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              padding: '0.65rem',
              borderRadius: '8px',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileText size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Modifications</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginTop: '0.15rem' }}>{stats.updates.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Deletions */}
        <div
          className="stat-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.25rem',
            background: 'var(--bg-card, #0f172a)',
            border: '1px solid var(--border-secondary, rgba(255, 255, 255, 0.08))',
            borderRadius: '10px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
          }}
        >
          <div
            style={{
              padding: '0.65rem',
              borderRadius: '8px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldAlert size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Deletions Recorded</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, marginTop: '0.15rem' }}>{stats.deletes.toLocaleString('en-IN')}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          padding: '0.875rem 1.25rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-primary)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '240px' }}>
          <Search
            size={15}
            style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by actor name, email, IP, field name, values, entity..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ paddingLeft: '2.4rem' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Action Filter */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="input"
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setCurrentPage(1);
            }}
            style={{ height: '38px', minWidth: '130px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Actions</option>
            {availableActions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            className="input"
            value={selectedEntity}
            onChange={(e) => {
              setSelectedEntity(e.target.value);
              setCurrentPage(1);
            }}
            style={{ height: '38px', minWidth: '140px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Entities</option>
            {availableEntities.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
          </select>

          {/* Date Quick Filter Pills */}
          <div style={{ display: 'flex', background: 'var(--bg-secondary, #1e293b)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-primary)' }}>
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((mode) => {
              const labels = { ALL: 'All Time', TODAY: 'Today', WEEK: '7 Days', MONTH: '30 Days' };
              const isSelected = dateFilter === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setDateFilter(mode);
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: '0.35rem 0.65rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: 'none',
                    background: isSelected ? '#6366f1' : 'transparent',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>

          {(searchTerm || selectedAction !== 'ALL' || selectedEntity !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedAction('ALL');
                setSelectedEntity('ALL');
                setDateFilter('ALL');
                setCurrentPage(1);
              }}
              className="btn btn-ghost"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="table-container" style={{ borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', background: 'var(--bg-secondary, #111827)', overflowX: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <table className="data-table" style={{ width: '100%', minWidth: '1050px' }}>
          <thead>
            <tr>
              <th style={{ width: '160px' }}>Date &amp; Time (IST)</th>
              <th style={{ width: '250px' }}>Actor</th>
              <th style={{ width: '105px' }}>Action</th>
              <th style={{ width: '130px' }}>Entity</th>
              <th>Changes &amp; Summary</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted" style={{ padding: '3.5rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert className="h-10 w-10 text-muted" style={{ opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: '#f8fafc' }}>No audit log entries match your search criteria.</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Try broadening your search term or clearing filters.</div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedLogs.map((log) => {
                const dateObj = new Date(log.createdAt);
                const istFormatted = dateObj.toLocaleString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                const actor = parseActorIdentity(log.userName);
                const ipTag = log.ipAddress ? log.ipAddress : null;

                // Extract diffs
                const allDiffs = getDetailedDiffs(log.oldValue, log.newValue);
                const changedDiffs = allDiffs.filter((d) => d.isChanged || d.isAdded || d.isRemoved);

                return (
                  <tr
                    key={log.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setInspectedLog(log);
                      setActiveModalTab('diff');
                      setDiffOnlyFilter(true);
                    }}
                    className="hover-row"
                  >
                    {/* Timestamp */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                          {istFormatted}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                            #{log.id.slice(-8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actor */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                        {/* Avatar Stamp */}
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.76rem',
                            flexShrink: 0,
                            background: actor.isSystem
                              ? 'rgba(100, 116, 139, 0.2)'
                              : actor.role === 'SUPER_ADMIN'
                              ? 'rgba(99, 102, 241, 0.2)'
                              : 'rgba(59, 130, 246, 0.2)',
                            color: actor.isSystem
                              ? '#94a3b8'
                              : actor.role === 'SUPER_ADMIN'
                              ? '#a5b4fc'
                              : '#60a5fa',
                            border: actor.isSystem
                              ? '1px solid rgba(100, 116, 139, 0.3)'
                              : actor.role === 'SUPER_ADMIN'
                              ? '1px solid rgba(99, 102, 241, 0.35)'
                              : '1px solid rgba(59, 130, 246, 0.35)',
                          }}
                        >
                          {actor.isSystem ? 'SYS' : actor.initials}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                          {/* Name + Role Pill */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap' }}>
                              {actor.name}
                            </span>
                            {actor.role && (
                              <span
                                style={{
                                  fontSize: '0.64rem',
                                  fontWeight: 700,
                                  padding: '0.08rem 0.4rem',
                                  borderRadius: '4px',
                                  letterSpacing: '0.04em',
                                  background:
                                    actor.role === 'SUPER_ADMIN'
                                      ? 'rgba(99, 102, 241, 0.15)'
                                      : actor.role === 'HR_ADMIN'
                                      ? 'rgba(59, 130, 246, 0.15)'
                                      : 'rgba(100, 116, 139, 0.15)',
                                  color:
                                    actor.role === 'SUPER_ADMIN'
                                      ? '#a5b4fc'
                                      : actor.role === 'HR_ADMIN'
                                      ? '#60a5fa'
                                      : '#94a3b8',
                                  border:
                                    actor.role === 'SUPER_ADMIN'
                                      ? '1px solid rgba(99, 102, 241, 0.3)'
                                      : '1px solid rgba(59, 130, 246, 0.3)',
                                }}
                              >
                                {actor.role}
                              </span>
                            )}
                          </div>

                          {/* Email */}
                          {actor.email && (
                            <div style={{ fontSize: '0.73rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Mail className="h-3 w-3" style={{ color: '#94a3b8', flexShrink: 0 }} />
                              <span>{actor.email}</span>
                            </div>
                          )}

                          {/* IP Address */}
                          {ipTag && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.71rem', color: '#94a3b8' }}>
                              <Globe size={11} style={{ color: '#64748b' }} />
                              <span style={{ fontFamily: 'monospace' }}>IP: {ipTag}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ fontWeight: 700, fontSize: '0.74rem', letterSpacing: '0.02em' }}>
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {log.entity}
                        </span>
                        {log.entityId && (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }} title={`Entity ID: ${log.entityId}`}>
                            {log.entityId.length > 14 ? log.entityId.slice(0, 14) + '...' : log.entityId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Changes & Summary */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {/* Primary Reason / Summary */}
                        {log.reason ? (
                          <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600, lineHeight: 1.45 }}>
                            {formatReasonText(log.reason)}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No summary recorded
                          </div>
                        )}

                        {/* Field Diffs Stream */}
                        {changedDiffs.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.2rem' }}>
                            {changedDiffs.slice(0, 3).map((d) => {
                              const isBool = typeof d.newVal === 'boolean' || typeof d.oldVal === 'boolean';
                              const oldFormatted = d.oldVal !== undefined ? formatValueForDisplay(d.oldVal, d.key) : null;
                              const newFormatted = formatValueForDisplay(d.newVal, d.key, d.oldVal);
                              const isEnabled = d.newVal === true || newFormatted === 'Enabled' || newFormatted === 'Waived' || newFormatted === 'Active';
                              const isOldEnabled = d.oldVal === true || oldFormatted === 'Enabled' || oldFormatted === 'Waived' || oldFormatted === 'Active';

                              return (
                                <span
                                  key={d.key}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    fontSize: '0.74rem',
                                    padding: '0.22rem 0.55rem',
                                    borderRadius: '6px',
                                    background: 'rgba(30, 41, 59, 0.95)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    lineHeight: 1.35,
                                  }}
                                >
                                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{d.humanKey}:</span>
                                  {oldFormatted !== null && (
                                    <span
                                      style={{
                                        color: isBool ? (isOldEnabled ? '#34d399' : '#f87171') : '#f87171',
                                        textDecoration: isBool ? 'none' : 'line-through',
                                        background: isBool
                                          ? isOldEnabled ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)'
                                          : 'rgba(239, 68, 68, 0.14)',
                                        padding: '0.08rem 0.35rem',
                                        borderRadius: '4px',
                                        fontWeight: 600,
                                        fontSize: '0.72rem',
                                      }}
                                    >
                                      {oldFormatted}
                                    </span>
                                  )}
                                  <ArrowRight className="h-3 w-3" style={{ color: '#64748b' }} />
                                  <span
                                    style={{
                                      color: isBool ? (isEnabled ? '#34d399' : '#f87171') : '#38bdf8',
                                      fontWeight: 700,
                                      background: isBool
                                        ? isEnabled ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)'
                                        : 'rgba(56, 189, 248, 0.14)',
                                      padding: '0.08rem 0.38rem',
                                      borderRadius: '4px',
                                      fontSize: '0.72rem',
                                    }}
                                  >
                                    {newFormatted}
                                  </span>
                                </span>
                              );
                            })}

                            {changedDiffs.length > 3 && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '0.2rem 0.5rem',
                                  borderRadius: '5px',
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  color: '#a5b4fc',
                                  border: '1px solid rgba(99, 102, 241, 0.25)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                }}
                              >
                                +{changedDiffs.length - 3} more modified
                              </span>
                            )}
                          </div>
                        ) : (
                          (log.newValue || log.oldValue) && (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.1rem' }}>
                              {log.action === 'GENERATE' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.45rem', borderRadius: '4px', background: 'rgba(139, 92, 246, 0.12)', color: '#a78bfa', border: '1px solid rgba(139, 92, 246, 0.25)', fontWeight: 600 }}>
                                  Document Generated
                                </span>
                              )}
                              {log.action === 'CREATE' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.45rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.25)', fontWeight: 600 }}>
                                  Record Created
                                </span>
                              )}
                              {log.action === 'DELETE' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.12rem 0.45rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)', fontWeight: 600 }}>
                                  Record Deleted
                                </span>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </td>

                    {/* Inspect button */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedLog(log);
                          setActiveModalTab('diff');
                          setDiffOnlyFilter(true);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{
                          padding: '0.32rem 0.75rem',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontWeight: 600,
                          borderRadius: '6px',
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '0.5rem 0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
          <span>
            Showing <strong>{filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong>{Math.min(currentPage * pageSize, filteredLogs.length)}</strong> of{' '}
            <strong>{filteredLogs.length.toLocaleString('en-IN')}</strong> entries
            {filteredLogs.length !== totalCount && ` (filtered from ${totalCount.toLocaleString('en-IN')})`}
          </span>

          <select
            className="input"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            style={{ height: '32px', fontSize: '0.8rem', padding: '0 0.5rem' }}
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '0 0.5rem' }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

            {/* ======================================================== */}
      {/* FULL FORENSIC INSPECTOR MODAL (PORTALED & THEME AWARE) */}
      {/* ======================================================== */}
      {mounted && inspectedLog && createPortal(
        <div
          className="audit-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedLog(null);
          }}
        >
          <div className="audit-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="audit-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', flexShrink: 0 }}>
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${getActionBadgeClass(inspectedLog.action)}`} style={{ fontWeight: 700, fontSize: '0.74rem' }}>
                      {inspectedLog.action}
                    </span>
                    <span className="audit-modal-title">
                      {inspectedLog.entity}
                    </span>
                    <span className="audit-id-badge">
                      #{inspectedLog.id}
                    </span>
                  </div>
                  <div className="audit-modal-subtitle">
                    <Clock className="h-3 w-3" style={{ flexShrink: 0 }} />
                    <span>
                      {new Date(inspectedLog.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'medium',
                      })}{' '}
                      IST
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(inspectedLog, null, 2), 'full')}
                  className="audit-modal-btn"
                  title="Copy full JSON record"
                >
                  {copiedId === 'full' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedId === 'full' ? 'Copied' : 'Copy JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedLog(null)}
                  className="audit-modal-close-btn"
                  title="Close Inspector"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="audit-modal-body">
              {/* Context Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.875rem' }}>
                {/* Actor Info Card */}
                {(() => {
                  const actor = parseActorIdentity(inspectedLog.userName);
                  return (
                    <div className="audit-info-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Actor Details</span>
                        </div>
                        {actor.role && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.12)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                            {actor.role}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                          {actor.initials}
                        </div>
                        <div>
                          <div className="audit-card-title">
                            {actor.name}
                          </div>
                          {actor.email && (
                            <div className="audit-card-subtext">
                              <Mail className="h-3 w-3" style={{ flexShrink: 0 }} />
                              <span>{actor.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="audit-card-footer">
                        {inspectedLog.userId && (
                          <div style={{ fontFamily: 'monospace' }}>
                            User ID: <span>{inspectedLog.userId}</span>
                          </div>
                        )}
                        {inspectedLog.ipAddress && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'monospace' }}>
                            <Globe size={11} style={{ flexShrink: 0 }} />
                            <span>IP: {inspectedLog.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Target Entity Info Card */}
                <div className="audit-info-card">
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Layers className="h-3.5 w-3.5" />
                    <span>Target Record</span>
                  </div>
                  <div className="audit-card-title">
                    {inspectedLog.entity}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.45rem' }}>
                    <span className="audit-target-id-badge">
                      ID: {inspectedLog.entityId || 'N/A'}
                    </span>
                    {inspectedLog.entityId && (
                      <button
                        type="button"
                        onClick={() => handleCopy(inspectedLog.entityId!, 'entityId')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', padding: '0 0.2rem', display: 'inline-flex', alignItems: 'center' }}
                        title="Copy Entity ID"
                      >
                        {copiedId === 'entityId' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Summary Callout Box */}
              {inspectedLog.reason && (
                <div className="audit-summary-callout">
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Activity className="h-3.5 w-3.5" />
                    <span>Action Summary</span>
                  </div>
                  <div className="audit-summary-text">
                    {formatReasonText(inspectedLog.reason)}
                  </div>
                </div>
              )}

              {/* Tabs for Data Inspection */}
              <div className="audit-tab-bar">
                {(() => {
                  const allDiffs = getDetailedDiffs(inspectedLog.oldValue, inspectedLog.newValue);
                  const modifiedCount = allDiffs.filter((d) => d.isChanged || d.isAdded || d.isRemoved).length;
                  return (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('diff')}
                      className={`audit-tab-btn ${activeModalTab === 'diff' ? 'active' : ''}`}
                    >
                      <span>Field Comparison</span>
                      {modifiedCount > 0 && (
                        <span style={{ fontSize: '0.7rem', padding: '0.08rem 0.4rem', borderRadius: '999px', background: activeModalTab === 'diff' ? 'rgba(0, 0, 0, 0.25)' : 'rgba(99, 102, 241, 0.2)', color: activeModalTab === 'diff' ? '#ffffff' : '#6366f1', fontWeight: 700 }}>
                          {modifiedCount}
                        </span>
                      )}
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setActiveModalTab('new')}
                  className={`audit-tab-btn ${activeModalTab === 'new' ? 'active' : ''}`}
                >
                  New State Payload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('old')}
                  className={`audit-tab-btn ${activeModalTab === 'old' ? 'active' : ''}`}
                >
                  Previous State Payload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('raw')}
                  className={`audit-tab-btn ${activeModalTab === 'raw' ? 'active' : ''}`}
                >
                  Raw Audit Log Record
                </button>
              </div>

              {/* Tab Content: Diff Comparison */}
              {activeModalTab === 'diff' && (
                <div className="audit-diff-box">
                  {(() => {
                    const allDiffs = getDetailedDiffs(inspectedLog.oldValue, inspectedLog.newValue);
                    const modifiedDiffs = allDiffs.filter((d) => d.isChanged || d.isAdded || d.isRemoved);
                    const displayedDiffs = diffOnlyFilter && modifiedDiffs.length > 0 ? modifiedDiffs : allDiffs;

                    if (!allDiffs || allDiffs.length === 0) {
                      return (
                        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
                          No structured object payload to compare (action did not record key-value pairs).
                        </div>
                      );
                    }

                    return (
                      <div>
                        {/* Diff Sub-header with Filter Toggle */}
                        <div className="audit-diff-subheader">
                          <div className="audit-diff-count-text">
                            <span style={{ fontWeight: 700 }}>
                              {modifiedDiffs.length} Field{modifiedDiffs.length === 1 ? '' : 's'} Modified
                            </span>
                            <span style={{ opacity: 0.8 }}>· {allDiffs.length} total attributes in payload</span>
                          </div>

                          {modifiedDiffs.length > 0 && modifiedDiffs.length < allDiffs.length && (
                            <button
                              type="button"
                              onClick={() => setDiffOnlyFilter(!diffOnlyFilter)}
                              className="audit-diff-toggle-btn"
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              <span>{diffOnlyFilter ? 'Showing Changed Only' : 'Showing All Fields'}</span>
                            </button>
                          )}
                        </div>

                        {/* Diff Table with FIXED Column Layout */}
                        <div style={{ maxHeight: '430px', overflowY: 'auto' }}>
                          <table className="audit-diff-table">
                            <thead>
                              <tr>
                                <th style={{ width: '24%' }}>Field / Property</th>
                                <th style={{ width: '31%' }}>Previous Value (Before)</th>
                                <th style={{ width: '38px', textAlign: 'center' }}></th>
                                <th style={{ width: '31%' }}>Updated Value (After)</th>
                                <th style={{ width: '14%', textAlign: 'center' }}>State</th>
                              </tr>
                            </thead>
                            <tbody>
                              {displayedDiffs.map((d, idx) => {
                                let stateBadge = null;
                                if (d.isAdded) {
                                  stateBadge = <span className="badge badge-success" style={{ fontSize: '0.72rem', fontWeight: 800 }}>Added</span>;
                                } else if (d.isRemoved) {
                                  stateBadge = <span className="badge badge-error" style={{ fontSize: '0.72rem', fontWeight: 800 }}>Removed</span>;
                                } else if (d.isChanged) {
                                  stateBadge = <span className="badge badge-warning" style={{ fontSize: '0.72rem', fontWeight: 800 }}>Modified</span>;
                                } else {
                                  stateBadge = <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>Unchanged</span>;
                                }

                                const prevText = formatValueForDisplay(d.oldVal, d.key);
                                const nextText = formatValueForDisplay(d.newVal, d.key, d.oldVal);

                                const rowClass = d.isChanged
                                  ? 'audit-row-changed'
                                  : d.isAdded
                                  ? 'audit-row-added'
                                  : d.isRemoved
                                  ? 'audit-row-removed'
                                  : idx % 2 === 0
                                  ? 'audit-row-neutral-even'
                                  : 'audit-row-neutral-odd';

                                return (
                                  <tr key={d.key} className={rowClass}>
                                    <td>
                                      <div className="audit-field-human">
                                        {d.humanKey}
                                      </div>
                                      <div className="audit-field-raw">
                                        {d.key}
                                      </div>
                                    </td>
                                    <td>
                                      {d.oldVal !== undefined ? (
                                        <div
                                          className={d.isChanged ? 'audit-val-pill-prev-changed' : 'audit-val-pill-prev-same'}
                                          style={{
                                            textDecoration: d.isChanged && typeof d.oldVal !== 'boolean' && typeof d.newVal !== 'boolean' ? 'line-through' : undefined,
                                            fontFamily: typeof d.oldVal === 'number' || typeof d.oldVal === 'boolean' ? 'monospace' : 'inherit',
                                          }}
                                        >
                                          {prevText}
                                        </div>
                                      ) : (
                                        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>[Not Set]</span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '0.5rem 0.2rem' }}>
                                      {d.isChanged && <ArrowRight className="h-4 w-4" style={{ color: '#0284c7', margin: '0 auto' }} />}
                                    </td>
                                    <td>
                                      {d.newVal !== undefined || d.oldVal !== undefined ? (
                                        <div
                                          className={d.isChanged ? 'audit-val-pill-next-changed' : 'audit-val-pill-next-same'}
                                          style={{
                                            fontFamily: typeof d.newVal === 'number' || typeof d.newVal === 'boolean' ? 'monospace' : 'inherit',
                                          }}
                                        >
                                          {nextText}
                                        </div>
                                      ) : (
                                        <span style={{ color: 'var(--text-tertiary)', fontStyle: 'italic' }}>[Removed]</span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{stateBadge}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: New Value Payload */}
              {activeModalTab === 'new' && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(inspectedLog.newValue || '', 'newVal')}
                    className="audit-modal-btn"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 1 }}
                  >
                    {copiedId === 'newVal' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedId === 'newVal' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <pre className="audit-pre-code">
                    {inspectedLog.newValue
                      ? JSON.stringify(parseSafeJson(inspectedLog.newValue), null, 2)
                      : '// No newValue captured'}
                  </pre>
                </div>
              )}

              {/* Tab Content: Old Value Payload */}
              {activeModalTab === 'old' && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(inspectedLog.oldValue || '', 'oldVal')}
                    className="audit-modal-btn"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 1 }}
                  >
                    {copiedId === 'oldVal' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedId === 'oldVal' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <pre className="audit-pre-code">
                    {inspectedLog.oldValue
                      ? JSON.stringify(parseSafeJson(inspectedLog.oldValue), null, 2)
                      : '// No oldValue recorded (e.g. record creation)'}
                  </pre>
                </div>
              )}

              {/* Tab Content: Raw Record */}
              {activeModalTab === 'raw' && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(inspectedLog, null, 2), 'rawRec')}
                    className="audit-modal-btn"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', zIndex: 1 }}
                  >
                    {copiedId === 'rawRec' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedId === 'rawRec' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <pre className="audit-pre-code">
                    {JSON.stringify(inspectedLog, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="audit-modal-footer">
              <div className="audit-footer-trail">
                <ShieldCheck className="h-4 w-4" style={{ color: '#10b981', flexShrink: 0 }} />
                <span>Enterprise Immutable Audit Record · Verified Session Trail</span>
              </div>

              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.4rem', fontWeight: 700 }}
              >
                Close Inspector
              </button>
            </div>
          </div>

          <style jsx>{`
            .audit-modal-overlay {
              position: fixed;
              inset: 0;
              width: 100vw;
              height: 100vh;
              z-index: 999999;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 1rem;
              background-color: rgba(3, 7, 18, 0.85);
              animation: auditFadeIn 0.15s ease-out;
            }
            :global([data-theme="light"]) .audit-modal-overlay {
              background-color: rgba(15, 23, 42, 0.45) !important;
            }

            .audit-modal-dialog {
              width: 100%;
              max-width: 960px;
              max-height: 88vh;
              background-color: #0f172a;
              color: #f1f5f9;
              border: 1px solid rgba(255, 255, 255, 0.12);
              border-radius: 14px;
              display: flex;
              flex-direction: column;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.75);
              overflow: hidden;
              animation: auditScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            }
            :global([data-theme="light"]) .audit-modal-dialog {
              background-color: #ffffff !important;
              color: #0f172a !important;
              border: 1px solid #e2e8f0 !important;
              box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.15) !important;
            }

            .audit-modal-header {
              padding: 1.15rem 1.5rem;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: rgba(15, 23, 42, 0.8);
              gap: 1rem;
            }
            :global([data-theme="light"]) .audit-modal-header {
              background-color: #f8fafc !important;
              border-bottom: 1px solid #e2e8f0 !important;
            }

            .audit-modal-title {
              font-size: 1.15rem;
              font-weight: 700;
              color: #f8fafc;
              letter-spacing: -0.02em;
            }
            :global([data-theme="light"]) .audit-modal-title {
              color: #0f172a !important;
            }

            .audit-modal-subtitle {
              font-size: 0.76rem;
              color: #94a3b8;
              display: flex;
              align-items: center;
              gap: 0.35rem;
              margin-top: 0.15rem;
            }
            :global([data-theme="light"]) .audit-modal-subtitle {
              color: #64748b !important;
            }

            .audit-id-badge {
              font-size: 0.74rem;
              color: #94a3b8;
              font-family: monospace;
              background: rgba(255, 255, 255, 0.06);
              padding: 0.12rem 0.45rem;
              border-radius: 4px;
            }
            :global([data-theme="light"]) .audit-id-badge {
              background: #e2e8f0 !important;
              color: #334155 !important;
              font-weight: 600 !important;
            }

            .audit-modal-btn {
              padding: 0.45rem 0.85rem;
              font-size: 0.78rem;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 0.45rem;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.15s ease;
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.12);
              color: #cbd5e1;
            }
            .audit-modal-btn:hover {
              background: rgba(255, 255, 255, 0.12);
              color: #ffffff;
            }
            :global([data-theme="light"]) .audit-modal-btn {
              background: #ffffff !important;
              border: 1px solid #cbd5e1 !important;
              color: #334155 !important;
            }
            :global([data-theme="light"]) .audit-modal-btn:hover {
              background: #f1f5f9 !important;
              color: #0f172a !important;
            }

            .audit-modal-close-btn {
              width: 32px;
              height: 32px;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #94a3b8;
              background: transparent;
              border: none;
              cursor: pointer;
              transition: all 0.15s ease;
            }
            .audit-modal-close-btn:hover {
              background: rgba(255, 255, 255, 0.08);
              color: #ffffff;
            }
            :global([data-theme="light"]) .audit-modal-close-btn {
              background: #f1f5f9 !important;
              color: #475569 !important;
            }
            :global([data-theme="light"]) .audit-modal-close-btn:hover {
              background: #e2e8f0 !important;
              color: #0f172a !important;
            }

            .audit-modal-body {
              padding: 1.25rem 1.5rem;
              overflow-y: auto;
              display: flex;
              flex-direction: column;
              gap: 1rem;
              background-color: #0f172a;
            }
            :global([data-theme="light"]) .audit-modal-body {
              background-color: #ffffff !important;
            }

            .audit-info-card {
              padding: 1rem 1.15rem;
              border-radius: 10px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              background: #1e293b;
            }
            :global([data-theme="light"]) .audit-info-card {
              background: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
            }

            .audit-card-title {
              font-weight: 600;
              font-size: 0.95rem;
              color: #f8fafc;
            }
            :global([data-theme="light"]) .audit-card-title {
              color: #0f172a !important;
              font-weight: 700 !important;
            }

            .audit-card-subtext {
              font-size: 0.76rem;
              color: #94a3b8;
              display: flex;
              align-items: center;
              gap: 0.3rem;
              margin-top: 0.15rem;
            }
            :global([data-theme="light"]) .audit-card-subtext {
              color: #64748b !important;
            }

            .audit-card-footer {
              margin-top: 0.75rem;
              padding-top: 0.65rem;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              display: flex;
              flex-wrap: wrap;
              gap: 0.75rem;
              font-size: 0.72rem;
              color: #94a3b8;
            }
            :global([data-theme="light"]) .audit-card-footer {
              border-top: 1px solid #e2e8f0 !important;
              color: #64748b !important;
            }
            :global([data-theme="light"]) .audit-card-footer span {
              color: #334155 !important;
              font-weight: 600 !important;
            }

            .audit-target-id-badge {
              font-size: 0.74rem;
              color: #94a3b8;
              font-family: monospace;
              background: rgba(0, 0, 0, 0.25);
              padding: 0.2rem 0.5rem;
              border-radius: 4px;
              border: 1px solid rgba(255, 255, 255, 0.06);
            }
            :global([data-theme="light"]) .audit-target-id-badge {
              background: #e2e8f0 !important;
              border: 1px solid #cbd5e1 !important;
              color: #1e293b !important;
              font-weight: 600 !important;
            }

            .audit-summary-callout {
              padding: 0.85rem 1rem;
              border-radius: 8px;
              background: rgba(99, 102, 241, 0.08);
              border: 1px solid rgba(99, 102, 241, 0.2);
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
            }
            :global([data-theme="light"]) .audit-summary-callout {
              background: #eef2ff !important;
              border: 1px solid #c7d2fe !important;
            }

            .audit-summary-text {
              font-size: 0.88rem;
              color: #e2e8f0;
              font-weight: 500;
              line-height: 1.5;
            }
            :global([data-theme="light"]) .audit-summary-text {
              color: #1e1b4b !important;
              font-weight: 600 !important;
            }

            .audit-tab-bar {
              display: flex;
              gap: 0.35rem;
              background: #1e293b;
              padding: 0.3rem;
              border-radius: 8px;
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            :global([data-theme="light"]) .audit-tab-bar {
              background: #f1f5f9 !important;
              border: 1px solid #e2e8f0 !important;
            }

            .audit-tab-btn {
              flex: 1;
              padding: 0.55rem 0.75rem;
              font-size: 0.82rem;
              font-weight: 600;
              border-radius: 6px;
              border: none;
              background: transparent;
              color: #94a3b8;
              cursor: pointer;
              transition: all 0.15s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.45rem;
            }
            .audit-tab-btn:hover:not(.active) {
              color: #ffffff;
            }
            .audit-tab-btn.active {
              background: #6366f1;
              color: #ffffff;
              font-weight: 700;
              box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
            }
            :global([data-theme="light"]) .audit-tab-btn {
              color: #475569 !important;
            }
            :global([data-theme="light"]) .audit-tab-btn:hover:not(.active) {
              background: #e2e8f0 !important;
              color: #0f172a !important;
            }
            :global([data-theme="light"]) .audit-tab-btn.active {
              background: #6366f1 !important;
              color: #ffffff !important;
            }

            .audit-diff-box {
              background: #131d33;
              border-radius: 12px;
              border: 1px solid rgba(255, 255, 255, 0.08);
              overflow: hidden;
            }
            :global([data-theme="light"]) .audit-diff-box {
              background: #ffffff !important;
              border: 1px solid #e2e8f0 !important;
            }

            .audit-diff-subheader {
              padding: 0.85rem 1.25rem;
              border-bottom: 1px solid rgba(255, 255, 255, 0.08);
              background: #0e172a;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 0.5rem;
            }
            :global([data-theme="light"]) .audit-diff-subheader {
              background: #f8fafc !important;
              border-bottom: 1px solid #e2e8f0 !important;
            }

            .audit-diff-count-text {
              font-size: 0.84rem;
              color: #e2e8f0;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }
            :global([data-theme="light"]) .audit-diff-count-text {
              color: #334155 !important;
            }
            :global([data-theme="light"]) .audit-diff-count-text span:first-child {
              color: #4338ca !important;
            }

            .audit-diff-toggle-btn {
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.1);
              color: #94a3b8;
              padding: 0.35rem 0.75rem;
              border-radius: 6px;
              font-size: 0.78rem;
              font-weight: 600;
              cursor: pointer;
              display: flex;
              align-items: center;
              gap: 0.4rem;
              transition: all 0.15s ease;
            }
            :global([data-theme="light"]) .audit-diff-toggle-btn {
              background: #ffffff !important;
              border: 1px solid #cbd5e1 !important;
              color: #475569 !important;
            }
            :global([data-theme="light"]) .audit-diff-toggle-btn:hover {
              background: #f1f5f9 !important;
              color: #0f172a !important;
            }

            .audit-diff-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 0.82rem;
              table-layout: fixed;
            }
            .audit-diff-table th {
              padding: 0.85rem 1rem;
              color: #94a3b8;
              font-weight: 700;
              text-transform: uppercase;
              font-size: 0.72rem;
              letter-spacing: 0.06em;
              background: #0a101f;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              text-align: left;
            }
            :global([data-theme="light"]) .audit-diff-table th {
              background: #f1f5f9 !important;
              border-bottom: 2px solid #e2e8f0 !important;
              color: #475569 !important;
            }

            .audit-diff-table td {
              padding: 0.75rem 1rem;
              vertical-align: middle;
              border-bottom: 1px solid rgba(255, 255, 255, 0.05);
              word-break: break-word;
              overflow-wrap: anywhere;
            }
            :global([data-theme="light"]) .audit-diff-table td {
              border-bottom: 1px solid #f1f5f9 !important;
            }

            .audit-row-changed {
              background: rgba(234, 179, 8, 0.08);
            }
            :global([data-theme="light"]) .audit-row-changed {
              background: rgba(254, 240, 138, 0.22) !important;
            }
            .audit-row-added {
              background: rgba(16, 185, 129, 0.08);
            }
            :global([data-theme="light"]) .audit-row-added {
              background: rgba(220, 252, 231, 0.35) !important;
            }
            .audit-row-removed {
              background: rgba(239, 68, 68, 0.08);
            }
            :global([data-theme="light"]) .audit-row-removed {
              background: rgba(254, 226, 226, 0.35) !important;
            }
            .audit-row-neutral-even {
              background: rgba(255, 255, 255, 0.015);
            }
            :global([data-theme="light"]) .audit-row-neutral-even {
              background: #fafafa !important;
            }
            .audit-row-neutral-odd {
              background: transparent;
            }
            :global([data-theme="light"]) .audit-row-neutral-odd {
              background: #ffffff !important;
            }

            .audit-field-human {
              font-weight: 800;
              color: #f8fafc;
              font-size: 0.86rem;
            }
            :global([data-theme="light"]) .audit-field-human {
              color: #0f172a !important;
            }

            .audit-field-raw {
              font-size: 0.71rem;
              color: #64748b;
              font-family: monospace;
              margin-top: 0.1rem;
            }

            .audit-val-pill-prev-changed {
              padding: 0.35rem 0.65rem;
              border-radius: 6px;
              background: rgba(239, 68, 68, 0.16);
              color: #f87171;
              font-weight: 600;
              display: inline-block;
              border: 1px solid rgba(239, 68, 68, 0.3);
              word-break: break-word;
              max-width: 100%;
            }
            :global([data-theme="light"]) .audit-val-pill-prev-changed {
              background: #fee2e2 !important;
              color: #b91c1c !important;
              border: 1px solid #fca5a5 !important;
            }

            .audit-val-pill-prev-same {
              padding: 0.35rem 0.65rem;
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.03);
              color: #94a3b8;
              font-weight: 500;
              display: inline-block;
              border: 1px solid transparent;
              word-break: break-word;
              max-width: 100%;
            }
            :global([data-theme="light"]) .audit-val-pill-prev-same {
              background: #f1f5f9 !important;
              color: #475569 !important;
              border: 1px solid #e2e8f0 !important;
            }

            .audit-val-pill-next-changed {
              padding: 0.35rem 0.65rem;
              border-radius: 6px;
              background: rgba(16, 185, 129, 0.18);
              color: #34d399;
              font-weight: 800;
              display: inline-block;
              border: 1px solid rgba(16, 185, 129, 0.35);
              word-break: break-word;
              max-width: 100%;
            }
            :global([data-theme="light"]) .audit-val-pill-next-changed {
              background: #dcfce7 !important;
              color: #15803d !important;
              border: 1px solid #86efac !important;
            }

            .audit-val-pill-next-same {
              padding: 0.35rem 0.65rem;
              border-radius: 6px;
              background: rgba(255, 255, 255, 0.03);
              color: #cbd5e1;
              font-weight: 500;
              display: inline-block;
              border: 1px solid transparent;
              word-break: break-word;
              max-width: 100%;
            }
            :global([data-theme="light"]) .audit-val-pill-next-same {
              background: #f1f5f9 !important;
              color: #475569 !important;
              border: 1px solid #e2e8f0 !important;
            }

            .audit-pre-code {
              margin: 0;
              padding: 1.25rem;
              border-radius: 10px;
              background: #070b14;
              border: 1px solid rgba(255, 255, 255, 0.08);
              color: #38bdf8;
              font-size: 0.8rem;
              font-family: monospace;
              max-height: 380px;
              overflow: auto;
              white-space: pre-wrap;
              word-break: break-all;
            }
            :global([data-theme="light"]) .audit-pre-code {
              background: #f8fafc !important;
              border: 1px solid #e2e8f0 !important;
              color: #0f172a !important;
            }

            .audit-modal-footer {
              padding: 1rem 1.75rem;
              border-top: 1px solid rgba(255, 255, 255, 0.08);
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #131d33;
            }
            :global([data-theme="light"]) .audit-modal-footer {
              background-color: #f8fafc !important;
              border-top: 1px solid #e2e8f0 !important;
            }

            .audit-footer-trail {
              display: flex;
              align-items: center;
              gap: 0.45rem;
              font-size: 0.78rem;
              color: #94a3b8;
            }
            :global([data-theme="light"]) .audit-footer-trail {
              color: #475569 !important;
              font-weight: 500 !important;
            }

            @keyframes auditFadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes auditScaleIn {
              from {
                opacity: 0;
                transform: scale(0.96);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>,
        document.body
      )}
    </div>
  );
}
