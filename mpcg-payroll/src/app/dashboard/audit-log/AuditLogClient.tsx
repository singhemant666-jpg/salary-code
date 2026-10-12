'use client';

import React, { useState, useMemo } from 'react';
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

export default function AuditLogClient({ initialLogs, totalCount }: AuditLogClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectedLog, setInspectedLog] = useState<AuditRecord | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'diff' | 'new' | 'old' | 'raw'>('diff');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      // Action filter
      if (selectedAction !== 'ALL' && log.action !== selectedAction) {
        return false;
      }

      // Entity filter
      if (selectedEntity !== 'ALL' && log.entity !== selectedEntity) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'ALL') {
        const logTime = new Date(log.createdAt).getTime();
        if (dateFilter === 'TODAY' && logTime < startOfToday) return false;
        if (dateFilter === 'WEEK' && logTime < sevenDaysAgo) return false;
        if (dateFilter === 'MONTH' && logTime < thirtyDaysAgo) return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesUser = (log.userName || '').toLowerCase().includes(q);
        const matchesAction = (log.action || '').toLowerCase().includes(q);
        const matchesEntity = (log.entity || '').toLowerCase().includes(q);
        const matchesEntityId = (log.entityId || '').toLowerCase().includes(q);
        const matchesReason = (log.reason || '').toLowerCase().includes(q);
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
      'User Name / Identity',
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
      return [
        escapeCSV(log.id),
        escapeCSV(dateFormatted),
        escapeCSV(log.action),
        escapeCSV(log.entity),
        escapeCSV(log.entityId || ''),
        escapeCSV(log.userName || ''),
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
    link.setAttribute('download', `mpcg_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
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

  // Helper to parse diff for modal
  const getFieldDiffs = (oldValStr: string | null, newValStr: string | null) => {
    const oldObj = parseSafeJson(oldValStr);
    const newObj = parseSafeJson(newValStr);

    if (
      (!oldObj || typeof oldObj !== 'object') &&
      (!newObj || typeof newObj !== 'object')
    ) {
      return null;
    }

    const allKeys = Array.from(
      new Set([
        ...Object.keys(oldObj || {}),
        ...Object.keys(newObj || {}),
      ])
    ).sort();

    return allKeys.map((key) => {
      const vOld = oldObj ? (oldObj as any)[key] : undefined;
      const vNew = newObj ? (newObj as any)[key] : undefined;

      const isAdded = vOld === undefined && vNew !== undefined;
      const isRemoved = vOld !== undefined && vNew === undefined;
      const isChanged = JSON.stringify(vOld) !== JSON.stringify(vNew);

      return {
        key,
        oldVal: vOld,
        newVal: vNew,
        isAdded,
        isRemoved,
        isChanged,
      };
    });
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
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Activity className="h-6 w-6 text-primary" />
            Complete Audit Log
          </h1>
          <p className="page-subtitle">
            Enterprise Activity Trail · Every employee profile modification, deduction edit, shift override, salary slip generation, and system action is fully logged.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}
          >
            <Download className="h-4 w-4" />
            Export to CSV ({filteredLogs.length})
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {/* Total Entries */}
        <div
          className="stat-card"
          style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.15rem 1.35rem' }}
        >
          <div
            style={{
              padding: '0.85rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: '#60a5fa',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(59, 130, 246, 0.1)',
            }}
          >
            <Layers size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Total Audit Entries</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{stats.total.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Today's Activity */}
        <div
          className="stat-card"
          style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.15rem 1.35rem' }}
        >
          <div
            style={{
              padding: '0.85rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.1)',
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Today&apos;s Activity</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{stats.today.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Profile & Deduction Edits */}
        <div
          className="stat-card"
          style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.15rem 1.35rem' }}
        >
          <div
            style={{
              padding: '0.85rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(109, 40, 217, 0.1) 100%)',
              border: '1px solid rgba(147, 51, 234, 0.2)',
              color: '#c084fc',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(147, 51, 234, 0.1)',
            }}
          >
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Profile &amp; Deductions Edits</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{stats.updates.toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Deletions */}
        <div
          className="stat-card"
          style={{ display: 'flex', alignItems: 'center', gap: '1.15rem', padding: '1.15rem 1.35rem' }}
        >
          <div
            style={{
              padding: '0.85rem',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.1) 100%)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              flexShrink: 0,
              boxShadow: '0 0 16px rgba(239, 68, 68, 0.1)',
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Deletions Recorded</div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{stats.deletes.toLocaleString('en-IN')}</div>
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
            placeholder="Search by user, action, entity, employee name, IP, or keyword..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ paddingLeft: '2.4rem', paddingRight: searchTerm ? '2.4rem' : '0.875rem', height: '38px', fontSize: '0.85rem' }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex', padding: 0 }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {/* Action Filter */}
          <select
            className="form-select"
            value={selectedAction}
            onChange={(e) => {
              setSelectedAction(e.target.value);
              setCurrentPage(1);
            }}
            style={{ height: '38px', fontSize: '0.84rem', minWidth: '135px', width: 'auto' }}
          >
            <option value="ALL">All Actions</option>
            {availableActions.map((act) => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>

          {/* Entity Filter */}
          <select
            className="form-select"
            value={selectedEntity}
            onChange={(e) => {
              setSelectedEntity(e.target.value);
              setCurrentPage(1);
            }}
            style={{ height: '38px', fontSize: '0.84rem', minWidth: '150px', width: 'auto' }}
          >
            <option value="ALL">All Entities</option>
            {availableEntities.map((ent) => (
              <option key={ent} value={ent}>{ent}</option>
            ))}
          </select>

          {/* Date Filter */}
          <div
            style={{
              display: 'flex',
              borderRadius: '8px',
              border: '1px solid var(--border-primary)',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.03)',
            }}
          >
            {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((filter, i) => (
              <button
                key={filter}
                type="button"
                onClick={() => { setDateFilter(filter); setCurrentPage(1); }}
                style={{
                  padding: '0 0.8rem',
                  height: '38px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderLeft: i > 0 ? '1px solid var(--border-primary)' : 'none',
                  background: dateFilter === filter
                    ? 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
                    : 'transparent',
                  color: dateFilter === filter ? '#fff' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  fontFamily: 'inherit',
                  letterSpacing: '-0.01em',
                }}
              >
                {filter === 'ALL' ? 'All Time' : filter === 'TODAY' ? 'Today' : filter === 'WEEK' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          {/* Reset Filters */}
          {(searchTerm || selectedAction !== 'ALL' || selectedEntity !== 'ALL' || dateFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedAction('ALL');
                setSelectedEntity('ALL');
                setDateFilter('ALL');
                setCurrentPage(1);
              }}
              className="btn btn-ghost"
              style={{ height: '38px', padding: '0 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Reset all filters"
            >
              <RefreshCw size={13} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div className="table-container" style={{ borderRadius: '10px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: 'var(--bg-secondary, #111827)' }}>
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '160px' }}>Date &amp; Time (IST)</th>
              <th style={{ width: '220px' }}>Actor / User</th>
              <th style={{ width: '110px' }}>Action</th>
              <th style={{ width: '130px' }}>Entity</th>
              <th>Reason &amp; Detailed Summary</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Inspect</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted" style={{ padding: '3.5rem 1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                    <ShieldAlert className="h-10 w-10 text-muted" style={{ opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, fontSize: '1rem' }}>No audit log entries match your search criteria.</div>
                    <div style={{ fontSize: '0.85rem' }}>Try broadening your search term or clearing filters.</div>
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

                const userNameRaw = log.userName || 'System / Automated';
                const ipTag = log.ipAddress ? log.ipAddress : null;

                return (
                  <tr
                    key={log.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setInspectedLog(log);
                      setActiveModalTab('diff');
                    }}
                    className="hover-row"
                  >
                    {/* Timestamp */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {istFormatted}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                          {log.id.slice(-8)}
                        </span>
                      </div>
                    </td>

                    {/* Actor */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <User className="h-3.5 w-3.5 text-muted" />
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {userNameRaw}
                          </span>
                        </div>
                        {ipTag && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: '#64748b' }}>
                            <Globe className="h-3 w-3 text-muted" />
                            <span>{ipTag}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Action */}
                    <td>
                      <span className={`badge ${getActionBadgeClass(log.action)}`} style={{ fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.02em' }}>
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
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace' }} title={`Entity ID: ${log.entityId}`}>
                            {log.entityId.length > 14 ? log.entityId.slice(0, 14) + '...' : log.entityId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Reason & Detailed Summary */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {log.reason ? (
                          <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.4 }}>
                            {log.reason}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No specific reason text provided
                          </div>
                        )}

                        {/* Quick payload summary snippet */}
                        {(log.newValue || log.oldValue) && (
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.15rem' }}>
                            {log.oldValue && (
                              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.12)', color: '#f87171', fontWeight: 500 }}>
                                Prev State
                              </span>
                            )}
                            {log.newValue && (
                              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', fontWeight: 500 }}>
                                New State
                              </span>
                            )}
                          </div>
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
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View All
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
      {/* FULL AUDIT INFORMATION INSPECTOR MODAL */}
      {/* ======================================================== */}
      {inspectedLog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(3, 7, 18, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.25rem',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setInspectedLog(null);
          }}
        >
          <div
            className="animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '920px',
              maxHeight: '90vh',
              backgroundColor: '#0f172a', /* Pure opaque solid dark slate - no see-through! */
              color: '#f1f5f9',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                backgroundColor: '#1e293b',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                  <span className={`badge ${getActionBadgeClass(inspectedLog.action)}`} style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                    {inspectedLog.action}
                  </span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc' }}>
                    {inspectedLog.entity}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                    #{inspectedLog.id}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock className="h-3.5 w-3.5 text-cyan-400" />
                  <span>
                    Recorded:{' '}
                    <strong style={{ color: '#e2e8f0' }}>
                      {new Date(inspectedLog.createdAt).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'full',
                        timeStyle: 'medium',
                      })}
                    </strong>{' '}
                    (IST)
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(inspectedLog, null, 2), 'full')}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#334155', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  {copiedId === 'full' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === 'full' ? 'Copied' : 'Copy All'}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedLog(null)}
                  className="btn btn-ghost"
                  style={{ padding: '0.45rem', borderRadius: '6px', color: '#94a3b8' }}
                  title="Close Inspector"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#0f172a' }}>
              {/* Context Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
                {/* Actor Info */}
                <div style={{ padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', background: '#1e293b' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                    Actor / Changed By
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' }}>
                      <User className="h-4 w-4" />
                    </div>
                    <span>{inspectedLog.userName || 'System (Automatic)'}</span>
                  </div>
                  {inspectedLog.userId && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.35rem' }}>
                      ID: {inspectedLog.userId}
                    </div>
                  )}
                  {inspectedLog.ipAddress && (
                    <div style={{ fontSize: '0.75rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.35rem' }}>
                      <Globe className="h-3 w-3" />
                      <span>IP: {inspectedLog.ipAddress}</span>
                    </div>
                  )}
                </div>

                {/* Target Entity Info */}
                <div style={{ padding: '1rem 1.15rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', background: '#1e293b' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
                    Target Record
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#f8fafc' }}>
                    {inspectedLog.entity}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      ID: {inspectedLog.entityId || 'N/A'}
                    </span>
                    {inspectedLog.entityId && (
                      <button
                        onClick={() => handleCopy(inspectedLog.entityId!, 'entityId')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', padding: '0 0.2rem' }}
                        title="Copy Entity ID"
                      >
                        {copiedId === 'entityId' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reason Callout Box */}
              {inspectedLog.reason && (
                <div
                  style={{
                    padding: '0.9rem 1.15rem',
                    borderRadius: '10px',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Action Reason / Description
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#e2e8f0', fontWeight: 500, lineHeight: 1.5 }}>
                    {inspectedLog.reason}
                  </div>
                </div>
              )}

              {/* Tabs for Data Inspection */}
              <div style={{ display: 'flex', gap: '0.35rem', background: '#1e293b', padding: '0.35rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('diff')}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: 'none',
                    background: activeModalTab === 'diff' ? '#06b6d4' : 'transparent',
                    color: activeModalTab === 'diff' ? '#0f172a' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Field Comparison (Diff)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('new')}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: 'none',
                    background: activeModalTab === 'new' ? '#06b6d4' : 'transparent',
                    color: activeModalTab === 'new' ? '#0f172a' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  New Value Payload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('old')}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: 'none',
                    background: activeModalTab === 'old' ? '#06b6d4' : 'transparent',
                    color: activeModalTab === 'old' ? '#0f172a' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Old Value Payload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('raw')}
                  style={{
                    flex: 1,
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    borderRadius: '7px',
                    border: 'none',
                    background: activeModalTab === 'raw' ? '#06b6d4' : 'transparent',
                    color: activeModalTab === 'raw' ? '#0f172a' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Raw Audit Log Record
                </button>
              </div>

              {/* Tab Content: Diff Comparison */}
              {activeModalTab === 'diff' && (
                <div style={{ background: '#1e293b', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  {(() => {
                    const diffs = getFieldDiffs(inspectedLog.oldValue, inspectedLog.newValue);
                    if (!diffs || diffs.length === 0) {
                      return (
                        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                          No structured object payload to compare (e.g. action did not record key-value pairs).
                        </div>
                      );
                    }

                    return (
                      <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ background: '#111827', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                              <th style={{ width: '200px', textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Field / Property</th>
                              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Previous Value</th>
                              <th style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>Updated Value</th>
                              <th style={{ width: '100px', textAlign: 'center', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.05em' }}>State</th>
                            </tr>
                          </thead>
                          <tbody>
                            {diffs.map((d, idx) => {
                              const formatVal = (v: any) => {
                                if (v === undefined) return <span style={{ color: '#64748b', fontStyle: 'italic' }}>[Not Set]</span>;
                                if (v === null) return <span style={{ color: '#64748b', fontStyle: 'italic' }}>null</span>;
                                if (typeof v === 'boolean') return <strong>{v ? 'true' : 'false'}</strong>;
                                if (typeof v === 'object') return <pre style={{ margin: 0, fontSize: '0.75rem' }}>{JSON.stringify(v, null, 2)}</pre>;
                                return String(v);
                              };

                              let stateBadge = null;
                              if (d.isAdded) {
                                stateBadge = <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Added</span>;
                              } else if (d.isRemoved) {
                                stateBadge = <span className="badge badge-error" style={{ fontSize: '0.7rem' }}>Removed</span>;
                              } else if (d.isChanged) {
                                stateBadge = <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>Modified</span>;
                              } else {
                                stateBadge = <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>Unchanged</span>;
                              }

                              return (
                                <tr
                                  key={d.key}
                                  style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                    background: d.isChanged
                                      ? 'rgba(234, 179, 8, 0.08)'
                                      : d.isAdded
                                      ? 'rgba(16, 185, 129, 0.08)'
                                      : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent'),
                                  }}
                                >
                                  <td style={{ padding: '0.65rem 1rem', fontWeight: 600, fontFamily: 'monospace', color: '#f1f5f9' }}>
                                    {d.key}
                                  </td>
                                  <td style={{ padding: '0.65rem 1rem', color: d.isChanged ? '#f87171' : '#cbd5e1', textDecoration: d.isChanged ? 'line-through' : undefined }}>
                                    {formatVal(d.oldVal)}
                                  </td>
                                  <td style={{ padding: '0.65rem 1rem', color: d.isChanged ? '#34d399' : '#cbd5e1', fontWeight: d.isChanged ? 600 : undefined }}>
                                    {formatVal(d.newVal)}
                                  </td>
                                  <td style={{ padding: '0.65rem 1rem', textAlign: 'center' }}>{stateBadge}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab Content: New Value Payload */}
              {activeModalTab === 'new' && (
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => handleCopy(inspectedLog.newValue || '', 'newVal')}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem', zIndex: 1, background: '#334155' }}
                  >
                    {copiedId === 'newVal' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === 'newVal' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <pre
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      borderRadius: '10px',
                      background: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#38bdf8',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      maxHeight: '380px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
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
                    onClick={() => handleCopy(inspectedLog.oldValue || '', 'oldVal')}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem', zIndex: 1, background: '#334155' }}
                  >
                    {copiedId === 'oldVal' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === 'oldVal' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <pre
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      borderRadius: '10px',
                      background: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      maxHeight: '380px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
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
                    onClick={() => handleCopy(JSON.stringify(inspectedLog, null, 2), 'rawRec')}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem', zIndex: 1, background: '#334155' }}
                  >
                    {copiedId === 'rawRec' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === 'rawRec' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <pre
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      borderRadius: '10px',
                      background: '#090d16',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      color: '#a7f3d0',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace',
                      maxHeight: '380px',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {JSON.stringify(inspectedLog, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'flex-end',
                backgroundColor: '#1e293b',
              }}
            >
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
        </div>
      )}
    </div>
  );
}
