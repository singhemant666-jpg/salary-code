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

const FIELD_NAME_MAP: Record<string, string> = {
  waiveLatePenaltyDeduction: 'Waive Late Penalty',
  waiveSuddenLeaveDeduction: 'Waive Sudden Leave',
  waiveShortHoursDeduction: 'Waive Short Hours',
  waiveHalfDayDeduction: 'Waive Half Day',
  waiveLopDeduction: 'Waive LOP Deduction',
  waivePtDeduction: 'Waive Professional Tax',
  waiveMissingPunchDeduction: 'Waive Missing Punch',
  strictLateRule: 'Strict Late Rule (3rd+ late)',
  sandwichRule: 'Sandwich Rule',
  basicSalary: 'Basic Salary',
  grossSalary: 'Gross Salary',
  netSalary: 'Net Salary',
  loanDeduction: 'Loan Recovery Deduction',
  tdsPercentage: 'TDS %',
  tdsEnabled: 'TDS Deductions',
  tdsMode: 'TDS Mode',
  tdsAmount: 'TDS Amount',
  advanceDeduction: 'Salary Advance Deducted',
  pfDeduction: 'PF Deduction',
  esiDeduction: 'ESI Deduction',
  professionalTax: 'Prof. Tax (PT)',
  holdSalaryDeduction: 'Hold Salary Deducted',
  holdSalaryReleaseAmount: 'Hold Salary Released',
  shortHoursDeduction: 'Short Hours Deduction',
  otherDeductions: 'Other Deductions',
  incentiveAmount: 'Incentive / Bonus',
  shiftStartTime: 'Shift Start Time',
  shiftEndTime: 'Shift End Time',
  effectiveDate: 'Effective Date',
  joiningDate: 'Joining Date',
  overtimeEligible: 'OT Eligible',
  overtimeRate: 'OT Hourly Rate',
  isActive: 'Active Status',
  department: 'Department',
  designation: 'Designation',
  mobile: 'Mobile Number',
  email: 'Email Address',
  bankAccountNumber: 'Bank A/C Number',
  bankIfscCode: 'IFSC Code',
  panNumber: 'PAN Number',
  aadhaarNumber: 'Aadhaar Number',
  uanNumber: 'UAN / PF Number',
  esiNumber: 'ESI Number',
  salaryType: 'Salary Type',
  paymentMode: 'Payment Mode',
};

export function humanizeFieldName(key: string): string {
  if (FIELD_NAME_MAP[key]) return FIELD_NAME_MAP[key];
  const spaced = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).trim();
}

export function formatValueForDisplay(val: any, key?: string, oldVal?: any): string {
  // If historical log recorded null for a boolean toggle (e.g. waiveLatePenaltyDeduction: false -> null)
  if ((val === null || val === undefined) && (oldVal === false || oldVal === true)) {
    return oldVal === false ? 'true (Waived / Enabled)' : 'false (Disabled)';
  }

  if (val === undefined) return '[Not Set]';
  if (val === null) {
    if (key && (key.startsWith('waive') || key.includes('Rule') || key.includes('Enabled'))) {
      return 'true (Waived / Enabled)';
    }
    return 'null';
  }
  if (typeof val === 'boolean') {
    if (key && key.startsWith('waive')) {
      return val ? 'true (Waived / Enabled)' : 'false (Not Waived)';
    }
    return val ? 'true (Enabled)' : 'false (Disabled)';
  }
  if (typeof val === 'number') {
    const currencyFields = ['salary', 'amount', 'deduction', 'incentive', 'bonus', 'rate', 'tax'];
    const isCurrency = key && currencyFields.some((f) => key.toLowerCase().includes(f));
    if (isCurrency && !key.toLowerCase().includes('percentage') && !key.toLowerCase().includes('hours')) {
      return `₹${val.toLocaleString('en-IN')}`;
    }
    return val.toLocaleString('en-IN');
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return '[Object]';
    }
  }
  const str = String(val).trim();
  if (!str) return 'empty';
  return str;
}

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
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Fingerprint className="h-7 w-7 text-cyan-400" />
            <span>Complete Audit Log &amp; Forensic Activity Trail</span>
          </h1>
          <p className="page-subtitle">
            Enterprise Security Trail · Every employee profile modification, deduction edit, shift override, salary slip generation, and system action is captured with actor identity and before/after field diffs.
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
                    background: isSelected ? '#06b6d4' : 'transparent',
                    color: isSelected ? '#0f172a' : 'var(--text-secondary)',
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
        <table className="data-table" style={{ width: '100%', minWidth: '1100px' }}>
          <thead>
            <tr>
              <th style={{ width: '150px' }}>Date &amp; Time (IST)</th>
              <th style={{ width: '270px' }}>Actor / Digital Fingerprint</th>
              <th style={{ width: '100px' }}>Action</th>
              <th style={{ width: '140px' }}>Entity</th>
              <th>Changes &amp; Forensic Trail (Who Changed What)</th>
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
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                          {istFormatted}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '0.05rem 0.35rem', borderRadius: '3px' }}>
                            #{log.id.slice(-8)}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actor / Identity Fingerprint */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                        {/* Avatar Stamp */}
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.78rem',
                            flexShrink: 0,
                            background: actor.isSystem
                              ? 'rgba(100, 116, 139, 0.2)'
                              : actor.role === 'SUPER_ADMIN'
                              ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(6, 182, 212, 0.25) 100%)'
                              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(14, 165, 233, 0.25) 100%)',
                            color: actor.isSystem
                              ? '#94a3b8'
                              : actor.role === 'SUPER_ADMIN'
                              ? '#c084fc'
                              : '#60a5fa',
                            border: actor.isSystem
                              ? '1px solid rgba(100, 116, 139, 0.3)'
                              : actor.role === 'SUPER_ADMIN'
                              ? '1px solid rgba(168, 85, 247, 0.4)'
                              : '1px solid rgba(59, 130, 246, 0.4)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                          }}
                        >
                          {actor.isSystem ? 'SYS' : actor.initials}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                          {/* Name + Role Pill */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap' }}>
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
                                      ? 'rgba(168, 85, 247, 0.18)'
                                      : actor.role === 'HR_ADMIN'
                                      ? 'rgba(59, 130, 246, 0.18)'
                                      : 'rgba(100, 116, 139, 0.18)',
                                  color:
                                    actor.role === 'SUPER_ADMIN'
                                      ? '#c084fc'
                                      : actor.role === 'HR_ADMIN'
                                      ? '#60a5fa'
                                      : '#94a3b8',
                                  border:
                                    actor.role === 'SUPER_ADMIN'
                                      ? '1px solid rgba(168, 85, 247, 0.35)'
                                      : '1px solid rgba(59, 130, 246, 0.35)',
                                }}
                              >
                                {actor.role}
                              </span>
                            )}
                          </div>

                          {/* Email */}
                          {actor.email && (
                            <div style={{ fontSize: '0.73rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Mail className="h-3 w-3 text-cyan-400" style={{ flexShrink: 0 }} />
                              <span>{actor.email}</span>
                            </div>
                          )}

                          {/* IP Address & Network Fingerprint */}
                          {ipTag && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.71rem', color: '#64748b' }}>
                              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                              <span style={{ fontFamily: 'monospace' }}>IP: {ipTag}</span>
                            </div>
                          )}
                        </div>
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
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }} title={`Entity ID: ${log.entityId}`}>
                            {log.entityId.length > 14 ? log.entityId.slice(0, 14) + '...' : log.entityId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Changes & Forensic Trail (Who Changed What) */}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {/* Primary Reason / Summary */}
                        {log.reason ? (
                          <div style={{ fontSize: '0.84rem', color: '#f1f5f9', fontWeight: 600, lineHeight: 1.4 }}>
                            {log.reason}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>
                            No summary recorded
                          </div>
                        )}

                        {/* Exact Field Diffs: WHO CHANGED WHAT INLINE STREAM */}
                        {changedDiffs.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.15rem' }}>
                            {changedDiffs.slice(0, 3).map((d) => (
                              <span
                                key={d.key}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                  fontSize: '0.73rem',
                                  padding: '0.22rem 0.55rem',
                                  borderRadius: '6px',
                                  background: 'rgba(30, 41, 59, 0.95)',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  lineHeight: 1.3,
                                }}
                              >
                                <span style={{ color: '#cbd5e1', fontWeight: 600 }}>{d.humanKey}:</span>
                                {d.oldVal !== undefined && (
                                  <span
                                    style={{
                                      color: '#f87171',
                                      textDecoration: 'line-through',
                                      background: 'rgba(239, 68, 68, 0.16)',
                                      padding: '0.05rem 0.35rem',
                                      borderRadius: '3px',
                                    }}
                                  >
                                    {formatValueForDisplay(d.oldVal, d.key)}
                                  </span>
                                )}
                                <ArrowRight className="h-3 w-3 text-cyan-400" />
                                <span
                                  style={{
                                    color: '#34d399',
                                    fontWeight: 700,
                                    background: 'rgba(16, 185, 129, 0.18)',
                                    padding: '0.05rem 0.35rem',
                                    borderRadius: '3px',
                                  }}
                                >
                                  {formatValueForDisplay(d.newVal, d.key, d.oldVal)}
                                </span>
                              </span>
                            ))}

                            {changedDiffs.length > 3 && (
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  padding: '0.22rem 0.55rem',
                                  borderRadius: '6px',
                                  background: 'rgba(6, 182, 212, 0.15)',
                                  color: '#38bdf8',
                                  border: '1px solid rgba(6, 182, 212, 0.3)',
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
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc', border: '1px solid rgba(168, 85, 247, 0.3)', fontWeight: 600 }}>
                                  Official Document Generated
                                </span>
                              )}
                              {log.action === 'CREATE' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', fontWeight: 600 }}>
                                  New Record Provisioned
                                </span>
                              )}
                              {log.action === 'DELETE' && (
                                <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 600 }}>
                                  Entity Purged
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
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(6, 182, 212, 0.3)', color: '#22d3ee', fontWeight: 600 }}
                      >
                        <Fingerprint className="h-3.5 w-3.5 text-cyan-400" />
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
      {/* FULL FORENSIC INSPECTOR MODAL */}
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
            backgroundColor: 'rgba(3, 7, 18, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
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
              maxWidth: '980px',
              maxHeight: '92vh',
              backgroundColor: '#0b1324',
              color: '#f1f5f9',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '16px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 25px rgba(6, 182, 212, 0.1)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#131d33',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee' }}>
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge ${getActionBadgeClass(inspectedLog.action)}`} style={{ fontWeight: 800, fontSize: '0.78rem', letterSpacing: '0.04em' }}>
                      {inspectedLog.action}
                    </span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
                      {inspectedLog.entity}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace', background: 'rgba(255, 255, 255, 0.06)', padding: '0.15rem 0.55rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      #{inspectedLog.id}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
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
              </div>

              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleCopy(JSON.stringify(inspectedLog, null, 2), 'full')}
                  className="btn btn-secondary"
                  style={{ padding: '0.45rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: '#1e293b', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  {copiedId === 'full' ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedId === 'full' ? 'Copied' : 'Copy All JSON'}
                </button>
                <button
                  type="button"
                  onClick={() => setInspectedLog(null)}
                  className="btn btn-ghost"
                  style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', background: 'rgba(255,255,255,0.04)' }}
                  title="Close Inspector"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: '#0b1324' }}>
              {/* Context Summary Cards: WHO CHANGED WHAT FINGERPRINT */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '1rem' }}>
                {/* Forensic Actor Info Card */}
                {(() => {
                  const actor = parseActorIdentity(inspectedLog.userName);
                  return (
                    <div style={{ padding: '1.15rem', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ShieldCheck className="h-4 w-4 text-purple-400" />
                          <span>Forensic Actor Identity (Who)</span>
                        </div>
                        {actor.role && (
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.12rem 0.5rem', borderRadius: '4px', background: 'rgba(168, 85, 247, 0.22)', color: '#d8b4fe', border: '1px solid rgba(168, 85, 247, 0.4)' }}>
                            {actor.role}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'linear-gradient(135deg, #a855f7, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0f172a', fontWeight: 800, fontSize: '0.92rem', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.3)' }}>
                          {actor.initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc' }}>
                            {actor.name}
                          </div>
                          {actor.email && (
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.1rem' }}>
                              <Mail className="h-3.5 w-3.5 text-cyan-400" />
                              <span>{actor.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem' }}>
                        {inspectedLog.userId && (
                          <div style={{ color: '#64748b', fontFamily: 'monospace' }}>
                            User ID: <span style={{ color: '#cbd5e1' }}>{inspectedLog.userId}</span>
                          </div>
                        )}
                        {inspectedLog.ipAddress && (
                          <div style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'monospace' }}>
                            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                            <span>IP: {inspectedLog.ipAddress}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Target Entity Info Card */}
                <div style={{ padding: '1.15rem', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)', boxShadow: '0 4px 14px rgba(0,0,0,0.25)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '0.5rem', letterSpacing: '0.07em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers className="h-4 w-4 text-blue-400" />
                    <span>Target Record (Entity)</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#f8fafc' }}>
                    {inspectedLog.entity}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontFamily: 'monospace', background: 'rgba(0,0,0,0.3)', padding: '0.25rem 0.55rem', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.06)' }}>
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
                    padding: '1rem 1.25rem',
                    borderRadius: '10px',
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Activity className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Action Reason / Detailed Summary</span>
                  </div>
                  <div style={{ fontSize: '0.92rem', color: '#e2e8f0', fontWeight: 500, lineHeight: 1.5 }}>
                    {inspectedLog.reason}
                  </div>
                </div>
              )}

              {/* Tabs for Data Inspection */}
              <div style={{ display: 'flex', gap: '0.35rem', background: '#131d33', padding: '0.35rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                {(() => {
                  const allDiffs = getDetailedDiffs(inspectedLog.oldValue, inspectedLog.newValue);
                  const modifiedCount = allDiffs.filter((d) => d.isChanged || d.isAdded || d.isRemoved).length;
                  return (
                    <button
                      type="button"
                      onClick={() => setActiveModalTab('diff')}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.85rem',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        borderRadius: '7px',
                        border: 'none',
                        background: activeModalTab === 'diff' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                        color: activeModalTab === 'diff' ? '#0f172a' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.45rem',
                      }}
                    >
                      <span>Field Comparison (Diff)</span>
                      {modifiedCount > 0 && (
                        <span style={{ fontSize: '0.72rem', padding: '0.1rem 0.45rem', borderRadius: '999px', background: activeModalTab === 'diff' ? 'rgba(15, 23, 42, 0.25)' : 'rgba(6, 182, 212, 0.2)', color: activeModalTab === 'diff' ? '#0f172a' : '#22d3ee', fontWeight: 800 }}>
                          {modifiedCount}
                        </span>
                      )}
                    </button>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setActiveModalTab('new')}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    background: activeModalTab === 'new' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                    color: activeModalTab === 'new' ? '#0f172a' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  New State Payload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('old')}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    background: activeModalTab === 'old' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                    color: activeModalTab === 'old' ? '#0f172a' : '#94a3b8',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Previous State Payload
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('raw')}
                  style={{
                    flex: 1,
                    padding: '0.6rem 0.85rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '7px',
                    border: 'none',
                    background: activeModalTab === 'raw' ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
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
                <div style={{ background: '#131d33', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', overflow: 'hidden' }}>
                  {(() => {
                    const allDiffs = getDetailedDiffs(inspectedLog.oldValue, inspectedLog.newValue);
                    const modifiedDiffs = allDiffs.filter((d) => d.isChanged || d.isAdded || d.isRemoved);
                    const displayedDiffs = diffOnlyFilter && modifiedDiffs.length > 0 ? modifiedDiffs : allDiffs;

                    if (!allDiffs || allDiffs.length === 0) {
                      return (
                        <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.88rem' }}>
                          No structured object payload to compare (e.g. action did not record key-value pairs).
                        </div>
                      );
                    }

                    return (
                      <div>
                        {/* Diff Sub-header with Filter Toggle */}
                        <div
                          style={{
                            padding: '0.85rem 1.25rem',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            background: '#0e172a',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ fontSize: '0.84rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 800, color: '#38bdf8' }}>
                              {modifiedDiffs.length} Field{modifiedDiffs.length === 1 ? '' : 's'} Modified
                            </span>
                            <span style={{ color: '#64748b' }}>· Total {allDiffs.length} attributes in payload</span>
                          </div>

                          {modifiedDiffs.length > 0 && modifiedDiffs.length < allDiffs.length && (
                            <button
                              type="button"
                              onClick={() => setDiffOnlyFilter(!diffOnlyFilter)}
                              style={{
                                background: diffOnlyFilter ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid',
                                borderColor: diffOnlyFilter ? 'rgba(6, 182, 212, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                                color: diffOnlyFilter ? '#22d3ee' : '#94a3b8',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <Sliders className="h-3.5 w-3.5" />
                              <span>{diffOnlyFilter ? 'Showing Changed Only' : 'Showing All Fields'}</span>
                            </button>
                          )}
                        </div>

                        {/* Diff Table */}
                        <div style={{ maxHeight: '430px', overflowY: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                            <thead>
                              <tr style={{ background: '#0a101f', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                <th style={{ width: '230px', textAlign: 'left', padding: '0.85rem 1.15rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em' }}>Field / Property</th>
                                <th style={{ textAlign: 'left', padding: '0.85rem 1.15rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em' }}>Previous Value (Before)</th>
                                <th style={{ width: '32px', textAlign: 'center', padding: '0.85rem 0.25rem' }}></th>
                                <th style={{ textAlign: 'left', padding: '0.85rem 1.15rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em' }}>Updated Value (After)</th>
                                <th style={{ width: '110px', textAlign: 'center', padding: '0.85rem 1.15rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.06em' }}>State</th>
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

                                return (
                                  <tr
                                    key={d.key}
                                    style={{
                                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                      background: d.isChanged
                                        ? 'rgba(234, 179, 8, 0.08)'
                                        : d.isAdded
                                        ? 'rgba(16, 185, 129, 0.08)'
                                        : d.isRemoved
                                        ? 'rgba(239, 68, 68, 0.08)'
                                        : (idx % 2 === 0 ? 'rgba(255, 255, 255, 0.015)' : 'transparent'),
                                    }}
                                  >
                                    <td style={{ padding: '0.75rem 1.15rem' }}>
                                      <div style={{ fontWeight: 800, color: '#f8fafc', fontSize: '0.86rem' }}>
                                        {d.humanKey}
                                      </div>
                                      <div style={{ fontSize: '0.71rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.1rem' }}>
                                        {d.key}
                                      </div>
                                    </td>
                                    <td style={{ padding: '0.75rem 1.15rem' }}>
                                      {d.oldVal !== undefined ? (
                                        <div
                                          style={{
                                            padding: '0.35rem 0.65rem',
                                            borderRadius: '6px',
                                            background: d.isChanged ? 'rgba(239, 68, 68, 0.16)' : 'rgba(255,255,255,0.03)',
                                            color: d.isChanged ? '#f87171' : '#94a3b8',
                                            textDecoration: d.isChanged ? 'line-through' : undefined,
                                            fontWeight: 600,
                                            fontFamily: typeof d.oldVal === 'number' || typeof d.oldVal === 'boolean' ? 'monospace' : 'inherit',
                                            display: 'inline-block',
                                            border: d.isChanged ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid transparent',
                                          }}
                                        >
                                          {prevText}
                                        </div>
                                      ) : (
                                        <span style={{ color: '#64748b', fontStyle: 'italic' }}>[Not Set]</span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'center', padding: '0.75rem 0.25rem' }}>
                                      {d.isChanged && <ArrowRight className="h-4 w-4 text-cyan-400" />}
                                    </td>
                                    <td style={{ padding: '0.75rem 1.15rem' }}>
                                      {d.newVal !== undefined || d.oldVal !== undefined ? (
                                        <div
                                          style={{
                                            padding: '0.35rem 0.65rem',
                                            borderRadius: '6px',
                                            background: d.isChanged ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.03)',
                                            color: d.isChanged ? '#34d399' : '#cbd5e1',
                                            fontWeight: d.isChanged ? 800 : 500,
                                            fontFamily: typeof d.newVal === 'number' || typeof d.newVal === 'boolean' ? 'monospace' : 'inherit',
                                            display: 'inline-block',
                                            border: d.isChanged ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                                          }}
                                        >
                                          {nextText}
                                        </div>
                                      ) : (
                                        <span style={{ color: '#64748b', fontStyle: 'italic' }}>[Removed]</span>
                                      )}
                                    </td>
                                    <td style={{ padding: '0.75rem 1.15rem', textAlign: 'center' }}>{stateBadge}</td>
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
                    onClick={() => handleCopy(inspectedLog.newValue || '', 'newVal')}
                    className="btn btn-secondary"
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem', zIndex: 1, background: '#1e293b' }}
                  >
                    {copiedId === 'newVal' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === 'newVal' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <pre
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      borderRadius: '10px',
                      background: '#070b14',
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
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem', zIndex: 1, background: '#1e293b' }}
                  >
                    {copiedId === 'oldVal' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === 'oldVal' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <pre
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      borderRadius: '10px',
                      background: '#070b14',
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
                    style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem', zIndex: 1, background: '#1e293b' }}
                  >
                    {copiedId === 'rawRec' ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    {copiedId === 'rawRec' ? 'Copied' : 'Copy JSON'}
                  </button>
                  <pre
                    style={{
                      margin: 0,
                      padding: '1.25rem',
                      borderRadius: '10px',
                      background: '#070b14',
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
                padding: '1rem 1.75rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#131d33',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Enterprise Immutable Audit Record · Verified Session Trail</span>
              </div>

              <button
                type="button"
                onClick={() => setInspectedLog(null)}
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #06b6d4, #0284c7)', border: 'none', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}
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
