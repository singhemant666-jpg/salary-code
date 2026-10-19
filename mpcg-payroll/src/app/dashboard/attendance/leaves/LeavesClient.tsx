'use client';

import { useState, useMemo } from 'react';
import LeaveModal from './LeaveModal';
import LeaveRowActions from './LeaveRowActions';
import LeaveReasonModal from './LeaveReasonModal';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Search,
  X,
  RotateCcw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  User,
  AlertCircle,
  Phone,
} from 'lucide-react';

export interface LeaveItem {
  id: string;
  employeeId: string;
  status: string;
  leaveType: string;
  isHalfDay: boolean;
  halfDayTime: string | null;
  reason: string | null;
  approvedBy: string | null;
  mobileNumber: string | null;
  createdAt: string;
  fromDateStr: string;
  toDateStr: string;
  fromDateRaw: string;
  toDateRaw: string;
  employee: {
    name: string;
    employeeId: string;
    department: string | null;
    mobile: string | null;
  };
}

interface LeavesClientProps {
  initialLeaves: LeaveItem[];
  employees: Array<{ id: string; name: string; employeeId: string; department: string | null }>;
}

const statusBadge: Record<string, string> = {
  PENDING: 'badge-warning',
  APPROVED: 'badge-approved',
  REJECTED: 'badge-error',
  CANCELLED: 'badge-draft',
};

// Helper: Initials
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Helper: Avatar color based on name hash
function getAvatarBg(name: string): string {
  const colors = [
    'linear-gradient(135deg, #6366f1, #4f46e5)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
    'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    'linear-gradient(135deg, #ec4899, #db2777)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// Helper: Duration calculation
function getLeaveDuration(leave: LeaveItem): { label: string; days: number; isHalf: boolean } {
  if (leave.isHalfDay) {
    const shiftText = leave.halfDayTime ? ` (${leave.halfDayTime})` : '';
    return { label: `0.5 Day${shiftText}`, days: 0.5, isHalf: true };
  }
  const d1 = new Date(leave.fromDateRaw);
  const d2 = new Date(leave.toDateRaw);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return { label: diffDays === 1 ? '1 Day' : `${diffDays} Days`, days: diffDays, isHalf: false };
}

// Helper: Format unified date range
function formatDatesUnified(fromStr: string, toStr: string): string {
  if (fromStr === toStr) return fromStr;
  return `${fromStr} – ${toStr}`;
}

export default function LeavesClient({ initialLeaves, employees }: LeavesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, PENDING, APPROVED, REJECTED, CANCELLED
  const [typeFilter, setTypeFilter] = useState<string>('ALL'); // ALL, PAID_LEAVE, UNPAID_LEAVE, HALF_DAY
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('ALL'); // ALL, THIS_MONTH, LAST_MONTH, TODAY, UPCOMING, CUSTOM
  const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>(''); // YYYY-MM-DD

  // Organization & Sorting
  const [sortBy, setSortBy] = useState<string>('PENDING_FIRST'); // PENDING_FIRST, DATE_DESC, DATE_ASC, NAME_ASC, DAYS_DESC

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Counts across all leaves
  const totalCount = initialLeaves.length;
  const pendingCount = useMemo(() => initialLeaves.filter(l => l.status === 'PENDING').length, [initialLeaves]);
  const approvedCount = useMemo(() => initialLeaves.filter(l => l.status === 'APPROVED').length, [initialLeaves]);
  const rejectedCount = useMemo(() => initialLeaves.filter(l => l.status === 'REJECTED').length, [initialLeaves]);
  const cancelledCount = useMemo(() => initialLeaves.filter(l => l.status === 'CANCELLED').length, [initialLeaves]);

  // Unique departments for dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    initialLeaves.forEach(l => {
      if (l.employee?.department?.trim()) {
        set.add(l.employee.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [initialLeaves]);

  // Unique leave types
  const leaveTypes = useMemo(() => {
    const set = new Set<string>();
    initialLeaves.forEach(l => {
      if (l.leaveType) set.add(l.leaveType);
    });
    return Array.from(set).sort();
  }, [initialLeaves]);

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    setCurrentPage(1);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    if (preset === 'THIS_MONTH') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = `${year}-${pad(month + 1)}-01`;
      const lastDayDate = new Date(year, month + 1, 0).getDate();
      const lastDay = `${year}-${pad(month + 1)}-${pad(lastDayDate)}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'LAST_MONTH') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prev.getFullYear();
      const month = prev.getMonth();
      const firstDay = `${year}-${pad(month + 1)}-01`;
      const lastDayDate = new Date(year, month + 1, 0).getDate();
      const lastDay = `${year}-${pad(month + 1)}-${pad(lastDayDate)}`;
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (preset === 'TODAY') {
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'UPCOMING') {
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      setStartDate(todayStr);
      setEndDate('');
    } else if (preset === 'ALL') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
    if (type === 'start') setStartDate(val);
    if (type === 'end') setEndDate(val);
    setDatePreset('CUSTOM');
    setCurrentPage(1);
  };

  // Filtered leaves
  const filteredLeaves = useMemo(() => {
    return initialLeaves.filter(leave => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && leave.status !== statusFilter) {
        return false;
      }

      // 2. Type Filter
      if (typeFilter !== 'ALL') {
        if (typeFilter === 'HALF_DAY') {
          if (!leave.isHalfDay) return false;
        } else if (leave.leaveType !== typeFilter) {
          return false;
        }
      }

      // 3. Department Filter
      if (departmentFilter !== 'ALL') {
        if ((leave.employee?.department || '').trim() !== departmentFilter) {
          return false;
        }
      }

      // 4. Date Range Filter
      if (startDate && leave.toDateRaw < startDate) {
        return false;
      }
      if (endDate && leave.fromDateRaw > endDate) {
        return false;
      }

      // 5. Search Query
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const empName = (leave.employee?.name || '').toLowerCase();
        const empId = (leave.employee?.employeeId || '').toLowerCase();
        const mobile = (leave.mobileNumber || leave.employee?.mobile || '').toLowerCase();
        const dept = (leave.employee?.department || '').toLowerCase();
        const reason = (leave.reason || '').toLowerCase();
        const approvedBy = (leave.approvedBy || '').toLowerCase();

        const match =
          empName.includes(q) ||
          empId.includes(q) ||
          mobile.includes(q) ||
          dept.includes(q) ||
          reason.includes(q) ||
          approvedBy.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [initialLeaves, statusFilter, typeFilter, departmentFilter, startDate, endDate, searchTerm]);

  // Sorted leaves
  const sortedLeaves = useMemo(() => {
    return [...filteredLeaves].sort((a, b) => {
      if (sortBy === 'PENDING_FIRST') {
        const order: Record<string, number> = { PENDING: 0, APPROVED: 1, REJECTED: 2, CANCELLED: 3 };
        const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
        if (diff !== 0) return diff;
        return b.fromDateRaw.localeCompare(a.fromDateRaw);
      }
      if (sortBy === 'DATE_DESC') {
        return b.fromDateRaw.localeCompare(a.fromDateRaw);
      }
      if (sortBy === 'DATE_ASC') {
        return a.fromDateRaw.localeCompare(b.fromDateRaw);
      }
      if (sortBy === 'NAME_ASC') {
        return a.employee.name.localeCompare(b.employee.name);
      }
      if (sortBy === 'DAYS_DESC') {
        const durA = getLeaveDuration(a).days;
        const durB = getLeaveDuration(b).days;
        return durB - durA;
      }
      return 0;
    });
  }, [filteredLeaves, sortBy]);

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(sortedLeaves.length / pageSize));
  const activePage = Math.min(currentPage, totalPages);
  const paginatedLeaves = useMemo(() => {
    const startIndex = (activePage - 1) * pageSize;
    return sortedLeaves.slice(startIndex, startIndex + pageSize);
  }, [sortedLeaves, activePage, pageSize]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    statusFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    departmentFilter !== 'ALL' ||
    datePreset !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    sortBy !== 'PENDING_FIRST';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setDepartmentFilter('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setSortBy('PENDING_FIRST');
    setCurrentPage(1);
  };

  const handleCardClick = (targetStatus: string) => {
    setCurrentPage(1);
    if (statusFilter === targetStatus) {
      setStatusFilter('ALL');
    } else {
      setStatusFilter(targetStatus);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <style>{`
        /* Responsive custom scrollbar for leave table */
        .leave-table-container::-webkit-scrollbar {
          height: 8px;
        }
        .leave-table-container::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 4px;
        }
        .leave-table-container::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.35);
          border-radius: 4px;
        }
        .leave-table-container::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.6);
        }

        /* Action buttons styling */
        .leave-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.32rem 0.65rem;
          font-size: 0.74rem;
          font-weight: 600;
          border-radius: 7px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          text-decoration: none;
          line-height: 1.2;
        }
        .leave-action-btn:hover:not(:disabled) {
          transform: translateY(-1px);
        }
        .leave-action-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .leave-action-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .leave-approve-btn {
          background: #16a34a;
          color: #ffffff;
          box-shadow: 0 1px 3px rgba(22, 163, 74, 0.3);
        }
        .leave-approve-btn:hover:not(:disabled) {
          background: #15803d;
          box-shadow: 0 2px 6px rgba(22, 163, 74, 0.4);
        }

        .leave-reject-btn {
          background: rgba(239, 68, 68, 0.1);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);
        }
        .leave-reject-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.45);
          color: #ef4444;
        }

        .leave-whatsapp-btn {
          background: rgba(37, 211, 102, 0.12);
          color: #22c55e;
          border-color: rgba(37, 211, 102, 0.3);
        }
        .leave-whatsapp-btn:hover:not(:disabled) {
          background: #22c55e;
          color: #ffffff;
          border-color: #22c55e;
          box-shadow: 0 2px 8px rgba(34, 197, 94, 0.35);
        }

        .leave-cancel-btn {
          background: rgba(255, 255, 255, 0.06);
          color: var(--text-secondary, #94a3b8);
          border-color: var(--border-secondary, rgba(255, 255, 255, 0.12));
        }
        .leave-cancel-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.12);
          color: var(--text-primary, #ffffff);
        }

        .leave-delete-btn {
          padding: 0.38rem;
          background: transparent;
          color: var(--text-tertiary, #64748b);
          border-color: transparent;
        }
        .leave-delete-btn:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.12);
          color: #ef4444;
          border-color: rgba(239, 68, 68, 0.25);
        }

        [data-theme="light"] .leave-cancel-btn {
          background: #f1f5f9;
          color: #475569;
          border-color: #cbd5e1;
        }
        [data-theme="light"] .leave-cancel-btn:hover:not(:disabled) {
          background: #e2e8f0;
          color: #0f172a;
        }
      `}</style>
      {/* Header & Main Action */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Calendar size={24} style={{ color: '#6366f1' }} />
            Leave Management Panel
          </h1>
          <p className="page-subtitle">Track, review, search, and approve employee leave applications & letters</p>
        </div>
        <LeaveModal employees={employees} />
      </div>

      {/* KPI Stats Bar - Clickable to filter */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
      }}>
        {/* Stat 1: Total Applications */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { setStatusFilter('ALL'); setCurrentPage(1); } }}
          className="glass-card-static"
          style={{
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'ALL' ? '2px solid #6366f1' : '1px solid var(--border-secondary)',
            boxShadow: statusFilter === 'ALL' ? 'inset 4px 0 0 #6366f1, 0 0 16px rgba(99, 102, 241, 0.25)' : 'inset 4px 0 0 #6366f1',
            background: statusFilter === 'ALL' ? 'rgba(99, 102, 241, 0.08)' : undefined,
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.7rem', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.14)', color: '#818cf8', display: 'flex' }}>
              <FileText size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>
                Total Requests
              </span>
              <strong style={{ fontSize: '1.45rem', color: 'var(--text-primary)', fontWeight: 800, lineHeight: 1.2 }}>
                {totalCount}
              </strong>
            </div>
          </div>
          {statusFilter === 'ALL' && (
            <span style={{ fontSize: '0.7rem', background: '#6366f1', color: '#fff', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: 700 }}>
              ALL
            </span>
          )}
        </div>

        {/* Stat 2: Pending Approval */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick('PENDING')}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('PENDING')}
          className="glass-card-static"
          style={{
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'PENDING' ? '2px solid #eab308' : '1px solid var(--border-secondary)',
            boxShadow: statusFilter === 'PENDING' ? 'inset 4px 0 0 #eab308, 0 0 16px rgba(234, 179, 8, 0.25)' : 'inset 4px 0 0 #eab308',
            background: statusFilter === 'PENDING' ? 'rgba(234, 179, 8, 0.08)' : undefined,
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.7rem', borderRadius: '10px', background: 'rgba(234, 179, 8, 0.14)', color: '#facc15', display: 'flex' }}>
              <Clock size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>
                Pending Review
              </span>
              <strong style={{ fontSize: '1.45rem', color: '#eab308', fontWeight: 800, lineHeight: 1.2 }}>
                {pendingCount}
              </strong>
            </div>
          </div>
          {statusFilter === 'PENDING' && (
            <span style={{ fontSize: '0.7rem', background: '#eab308', color: '#000', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: 700 }}>
              FILTERED
            </span>
          )}
        </div>

        {/* Stat 3: Approved Leaves */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick('APPROVED')}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('APPROVED')}
          className="glass-card-static"
          style={{
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'APPROVED' ? '2px solid #22c55e' : '1px solid var(--border-secondary)',
            boxShadow: statusFilter === 'APPROVED' ? 'inset 4px 0 0 #22c55e, 0 0 16px rgba(34, 197, 94, 0.25)' : 'inset 4px 0 0 #22c55e',
            background: statusFilter === 'APPROVED' ? 'rgba(34, 197, 94, 0.08)' : undefined,
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.7rem', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.14)', color: '#4ade80', display: 'flex' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>
                Approved
              </span>
              <strong style={{ fontSize: '1.45rem', color: '#22c55e', fontWeight: 800, lineHeight: 1.2 }}>
                {approvedCount}
              </strong>
            </div>
          </div>
          {statusFilter === 'APPROVED' && (
            <span style={{ fontSize: '0.7rem', background: '#22c55e', color: '#fff', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: 700 }}>
              FILTERED
            </span>
          )}
        </div>

        {/* Stat 4: Rejected Leaves */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleCardClick('REJECTED')}
          onKeyDown={(e) => e.key === 'Enter' && handleCardClick('REJECTED')}
          className="glass-card-static"
          style={{
            padding: '1.1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: statusFilter === 'REJECTED' ? '2px solid #ef4444' : '1px solid var(--border-secondary)',
            boxShadow: statusFilter === 'REJECTED' ? 'inset 4px 0 0 #ef4444, 0 0 16px rgba(239, 68, 68, 0.25)' : 'inset 4px 0 0 #ef4444',
            background: statusFilter === 'REJECTED' ? 'rgba(239, 68, 68, 0.08)' : undefined,
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ padding: '0.7rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.14)', color: '#f87171', display: 'flex' }}>
              <XCircle size={22} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, display: 'block' }}>
                Rejected
              </span>
              <strong style={{ fontSize: '1.45rem', color: '#ef4444', fontWeight: 800, lineHeight: 1.2 }}>
                {rejectedCount}
              </strong>
            </div>
          </div>
          {statusFilter === 'REJECTED' && (
            <span style={{ fontSize: '0.7rem', background: '#ef4444', color: '#fff', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: 700 }}>
              FILTERED
            </span>
          )}
        </div>
      </div>

      {/* Actionable Notice for Pending Leaves */}
      {pendingCount > 0 && statusFilter !== 'PENDING' && (
        <div style={{
          padding: '0.75rem 1.1rem',
          borderRadius: '10px',
          background: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.6rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <AlertCircle size={18} style={{ color: '#eab308' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {pendingCount} leave application{pendingCount === 1 ? '' : 's'} awaiting your review & approval.
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleCardClick('PENDING')}
            className="btn btn-sm"
            style={{
              background: '#eab308',
              color: '#000',
              fontWeight: 700,
              padding: '0.25rem 0.75rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
            }}
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Modern Search & Filters Control Bar */}
      <div
        className="glass-card-static"
        style={{
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.875rem',
          borderRadius: '14px',
          border: '1px solid var(--border-secondary)',
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Row 1: Search, Filters & Sorting */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Employee Search Bar */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={17}
              style={{
                position: 'absolute',
                left: '0.85rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search employee name, ID, phone, reason..."
              style={{
                paddingLeft: '2.4rem',
                paddingRight: searchTerm ? '2.4rem' : '1rem',
                height: '42px',
                borderRadius: '10px',
                width: '100%',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.875rem',
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                className="btn btn-ghost btn-icon"
                style={{
                  position: 'absolute',
                  right: '0.4rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '0.35rem',
                  color: 'var(--text-tertiary)',
                }}
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Leave Type Filter */}
          <div style={{ minWidth: '150px', flex: '0 1 160px' }}>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              style={{
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: typeFilter !== 'ALL' ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.85rem',
              }}
            >
              <option value="ALL">All Leave Types</option>
              {leaveTypes.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, ' ')}
                </option>
              ))}
              <option value="HALF_DAY">Half Day Only</option>
            </select>
          </div>

          {/* Department Filter */}
          {departments.length > 0 && (
            <div style={{ minWidth: '150px', flex: '0 1 160px' }}>
              <select
                className="form-select"
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: departmentFilter !== 'ALL' ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Filter Preset */}
          <div style={{ minWidth: '140px', flex: '0 1 150px' }}>
            <select
              className="form-select"
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              style={{
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: datePreset !== 'ALL' ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                color: datePreset !== 'ALL' ? '#a5b4fc' : 'var(--text-primary)',
                fontSize: '0.85rem',
                fontWeight: datePreset !== 'ALL' ? 600 : 400,
              }}
            >
              <option value="ALL">📅 All Dates</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="TODAY">Today</option>
              <option value="UPCOMING">Upcoming</option>
              <option value="CUSTOM">Custom Range...</option>
            </select>
          </div>

          {/* Date Range Inputs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.68rem',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
                fontWeight: 700,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}>
                From
              </span>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                style={{
                  height: '42px',
                  paddingLeft: '3rem',
                  paddingRight: '0.5rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: startDate ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  width: '142px',
                }}
                title="Filter leaves active on or after this date"
              />
            </div>

            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '0.65rem',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '0.68rem',
                color: 'var(--text-tertiary)',
                pointerEvents: 'none',
                fontWeight: 700,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
              }}>
                To
              </span>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                style={{
                  height: '42px',
                  paddingLeft: '2.4rem',
                  paddingRight: '0.5rem',
                  borderRadius: '10px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: endDate ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.82rem',
                  color: 'var(--text-primary)',
                  width: '135px',
                }}
                title="Filter leaves active on or before this date"
              />
            </div>

            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); setDatePreset('ALL'); }}
                className="btn btn-ghost btn-icon"
                style={{ padding: '0.35rem', color: 'var(--text-tertiary)', height: '42px', width: '32px' }}
                title="Clear date range"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div style={{ minWidth: '160px', flex: '0 1 170px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <ArrowUpDown size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
            <select
              className="form-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                height: '42px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontSize: '0.82rem',
                width: '100%',
              }}
              title="Organize list order"
            >
              <option value="PENDING_FIRST">⚡ Pending Action First</option>
              <option value="DATE_DESC">📅 Date: Newest First</option>
              <option value="DATE_ASC">📅 Date: Oldest First</option>
              <option value="NAME_ASC">👤 Employee Name (A–Z)</option>
              <option value="DAYS_DESC">⏳ Duration: Longest First</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-ghost"
              style={{
                height: '42px',
                gap: '0.4rem',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
                borderRadius: '10px',
                padding: '0 0.85rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
              title="Reset all search and filters"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}
        </div>

        {/* Row 2: Status Filter Segmented Buttons & Active Pills */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        }}>
          {/* Status Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginRight: '0.35rem' }}>
              Status:
            </span>

            {/* ALL */}
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: statusFilter === 'ALL' ? '1.5px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                background: statusFilter === 'ALL' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                color: statusFilter === 'ALL' ? '#a5b4fc' : 'var(--text-secondary)',
              }}
            >
              All Requests
              <span style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                background: statusFilter === 'ALL' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)',
                color: statusFilter === 'ALL' ? '#ffffff' : 'var(--text-tertiary)',
              }}>
                {totalCount}
              </span>
            </button>

            {/* PENDING */}
            <button
              type="button"
              onClick={() => handleCardClick('PENDING')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: statusFilter === 'PENDING' ? '1.5px solid #eab308' : '1px solid rgba(234, 179, 8, 0.2)',
                background: statusFilter === 'PENDING' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(234, 179, 8, 0.05)',
                color: statusFilter === 'PENDING' ? '#facc15' : '#ca8a04',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#eab308' }} />
              Pending Review
              <span style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                background: statusFilter === 'PENDING' ? '#eab308' : 'rgba(234, 179, 8, 0.18)',
                color: statusFilter === 'PENDING' ? '#000' : '#eab308',
                fontWeight: 700,
              }}>
                {pendingCount}
              </span>
            </button>

            {/* APPROVED */}
            <button
              type="button"
              onClick={() => handleCardClick('APPROVED')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: statusFilter === 'APPROVED' ? '1.5px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.2)',
                background: statusFilter === 'APPROVED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.05)',
                color: statusFilter === 'APPROVED' ? '#4ade80' : '#16a34a',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
              Approved
              <span style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                background: statusFilter === 'APPROVED' ? '#22c55e' : 'rgba(34, 197, 94, 0.18)',
                color: statusFilter === 'APPROVED' ? '#ffffff' : '#22c55e',
                fontWeight: 700,
              }}>
                {approvedCount}
              </span>
            </button>

            {/* REJECTED */}
            <button
              type="button"
              onClick={() => handleCardClick('REJECTED')}
              style={{
                padding: '0.35rem 0.8rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: statusFilter === 'REJECTED' ? '1.5px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.2)',
                background: statusFilter === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.05)',
                color: statusFilter === 'REJECTED' ? '#f87171' : '#dc2626',
              }}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }} />
              Rejected
              <span style={{
                fontSize: '0.7rem',
                padding: '0.1rem 0.45rem',
                borderRadius: '10px',
                background: statusFilter === 'REJECTED' ? '#ef4444' : 'rgba(239, 68, 68, 0.18)',
                color: statusFilter === 'REJECTED' ? '#ffffff' : '#ef4444',
                fontWeight: 700,
              }}>
                {rejectedCount}
              </span>
            </button>

            {/* CANCELLED (if any) */}
            {cancelledCount > 0 && (
              <button
                type="button"
                onClick={() => handleCardClick('CANCELLED')}
                style={{
                  padding: '0.35rem 0.8rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  border: statusFilter === 'CANCELLED' ? '1.5px solid #64748b' : '1px solid rgba(100, 116, 139, 0.2)',
                  background: statusFilter === 'CANCELLED' ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.05)',
                  color: statusFilter === 'CANCELLED' ? '#cbd5e1' : '#94a3b8',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8' }} />
                Cancelled
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  background: statusFilter === 'CANCELLED' ? '#64748b' : 'rgba(100, 116, 139, 0.18)',
                  color: '#ffffff',
                  fontWeight: 700,
                }}>
                  {cancelledCount}
                </span>
              </button>
            )}
          </div>

          {/* Results Summary & Active Dates Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {(startDate || endDate) && (
              <span style={{
                fontSize: '0.72rem',
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                color: '#a5b4fc',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontWeight: 600,
              }}>
                📅 {startDate ? `From ${startDate}` : ''} {endDate ? `To ${endDate}` : ''}
              </span>
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{sortedLeaves.length}</strong> of {totalCount} requests
            </div>
          </div>
        </div>
      </div>

      {/* Main Leave Applications Table Card */}
      <div
        className="table-container leave-table-container"
        style={{
          borderRadius: '14px',
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          position: 'relative',
          border: '1px solid var(--border-primary)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}
      >
        <table
          className="data-table"
          style={{
            width: '100%',
            minWidth: '1000px',
            borderCollapse: 'separate',
            borderSpacing: 0,
          }}
        >
          <thead>
            <tr>
              <th style={{ width: '200px', minWidth: '180px' }}>Employee</th>
              <th style={{ width: '95px', minWidth: '85px', whiteSpace: 'nowrap' }}>Employee ID</th>
              <th style={{ width: '185px', minWidth: '170px', whiteSpace: 'nowrap' }}>Dates & Duration</th>
              <th style={{ width: '115px', minWidth: '100px', whiteSpace: 'nowrap' }}>Leave Type</th>
              <th style={{ width: '105px', minWidth: '95px', whiteSpace: 'nowrap' }}>Status</th>
              <th style={{ minWidth: '160px' }}>Reason / Letter</th>
              <th style={{ width: '115px', minWidth: '100px', whiteSpace: 'nowrap' }}>Approved By</th>
              <th
                style={{
                  textAlign: 'right',
                  width: '120px',
                  minWidth: '110px',
                  whiteSpace: 'nowrap',
                  paddingRight: '1rem',
                }}
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedLeaves.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted" style={{ padding: '3.5rem 1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                    color: 'var(--text-tertiary)',
                  }}>
                    <Search size={22} />
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
                    {hasActiveFilters ? 'No Leave Requests Match Your Filters' : 'No Leave Applications Recorded'}
                  </div>
                  <p style={{ fontSize: '0.85rem', maxWidth: '420px', margin: '0 auto 1.25rem', color: 'var(--text-secondary)' }}>
                    {hasActiveFilters
                      ? `No leaves found matching status: "${statusFilter}"${searchTerm ? ` & query "${searchTerm}"` : ''}${startDate || endDate ? ` for the chosen dates` : ''}. Try resetting your search or filters.`
                      : 'Applications submitted by employees via the Leave Portal or created by HR will appear here automatically.'}
                  </p>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="btn btn-secondary"
                      style={{ gap: '0.5rem', margin: '0 auto' }}
                    >
                      <RotateCcw size={15} />
                      Reset All Filters
                    </button>
                  ) : (
                    <LeaveModal employees={employees} />
                  )}
                </td>
              </tr>
            ) : (
              paginatedLeaves.map((leave) => {
                const duration = getLeaveDuration(leave);
                const datesUnified = formatDatesUnified(leave.fromDateStr, leave.toDateStr);

                const leaveObj = {
                  id: leave.id,
                  status: leave.status,
                  reason: leave.reason,
                  employeeName: leave.employee.name,
                  employeeId: leave.employee.employeeId,
                  department: leave.employee.department,
                  mobileNumber: leave.mobileNumber || leave.employee.mobile,
                  fromDateStr: leave.fromDateStr,
                  toDateStr: leave.toDateStr,
                  fromDateRaw: leave.fromDateRaw,
                  toDateRaw: leave.toDateRaw,
                  leaveType: leave.leaveType,
                  isHalfDay: leave.isHalfDay,
                  halfDayTime: leave.halfDayTime,
                };

                const isPending = leave.status === 'PENDING';

                return (
                  <tr
                    key={leave.id}
                    style={{
                      background: isPending ? 'rgba(234, 179, 8, 0.03)' : undefined,
                      transition: 'background 0.15s ease',
                    }}
                  >
                    {/* 1. Employee Info with Avatar */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: getAvatarBg(leave.employee.name),
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                          }}
                        >
                          {getInitials(leave.employee.name)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            fontSize: '0.88rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {leave.employee.name}
                          </div>
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            marginTop: '0.1rem',
                            whiteSpace: 'nowrap',
                          }}>
                            {leave.mobileNumber || leave.employee.mobile ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={11} style={{ color: '#06b6d4', flexShrink: 0 }} />
                                {leave.mobileNumber || leave.employee.mobile}
                              </span>
                            ) : null}
                            {leave.employee.department && (
                              <span style={{
                                background: 'rgba(255,255,255,0.05)',
                                padding: '0.05rem 0.4rem',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                              }}>
                                {leave.employee.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Employee ID with nowrap */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span
                        className="font-mono text-xs"
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '6px',
                          color: '#cbd5e1',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          display: 'inline-block',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {leave.employee.employeeId}
                      </span>
                    </td>

                    {/* 3. Dates & Duration (Unified Column) */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}>
                        <Calendar size={13} style={{ color: '#06b6d4', flexShrink: 0 }} />
                        <span>{datesUnified}</span>
                      </div>
                      <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          padding: '0.12rem 0.55rem',
                          borderRadius: '12px',
                          fontWeight: 700,
                          background: duration.isHalf ? 'rgba(244, 63, 94, 0.12)' : 'rgba(6, 182, 212, 0.12)',
                          color: duration.isHalf ? '#fb7185' : '#22d3ee',
                          border: `1px solid ${duration.isHalf ? 'rgba(244, 63, 94, 0.25)' : 'rgba(6, 182, 212, 0.25)'}`,
                          display: 'inline-block',
                          letterSpacing: '0.02em',
                        }}>
                          {duration.label}
                        </span>
                      </div>
                    </td>

                    {/* 4. Leave Type */}
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          letterSpacing: '0.03em',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          background: leave.leaveType === 'PAID_LEAVE' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(99, 102, 241, 0.12)',
                          color: leave.leaveType === 'PAID_LEAVE' ? '#34d399' : '#a5b4fc',
                          border: `1px solid ${leave.leaveType === 'PAID_LEAVE' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(99, 102, 241, 0.25)'}`,
                          whiteSpace: 'nowrap',
                          display: 'inline-block',
                        }}
                      >
                        {leave.leaveType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* 5. Status with pill */}
                    <td>
                      <span
                        style={{
                          whiteSpace: 'nowrap',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                          letterSpacing: '0.03em',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '12px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          background: leave.status === 'PENDING'
                            ? 'rgba(234, 179, 8, 0.12)'
                            : leave.status === 'APPROVED'
                            ? 'rgba(16, 185, 129, 0.12)'
                            : leave.status === 'REJECTED'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(148, 163, 184, 0.12)',
                          color: leave.status === 'PENDING'
                            ? '#facc15'
                            : leave.status === 'APPROVED'
                            ? '#34d399'
                            : leave.status === 'REJECTED'
                            ? '#f87171'
                            : '#94a3b8',
                          border: `1px solid ${
                            leave.status === 'PENDING'
                              ? 'rgba(234, 179, 8, 0.28)'
                              : leave.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.28)'
                              : leave.status === 'REJECTED'
                              ? 'rgba(239, 68, 68, 0.28)'
                              : 'rgba(148, 163, 184, 0.25)'
                          }`,
                        }}
                      >
                        {isPending && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#facc15', display: 'inline-block' }} />}
                        {leave.status}
                      </span>
                    </td>

                    {/* 6. Reason / Letter */}
                    <td>
                      <div style={{ maxWidth: '240px' }}>
                        <LeaveReasonModal leave={leaveObj} />
                      </div>
                    </td>

                    {/* 7. Approved By */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {leave.approvedBy ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} style={{ color: 'var(--text-tertiary)' }} />
                          {leave.approvedBy}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>—</span>
                      )}
                    </td>

                    {/* 8. Actions */}
                    <td
                      style={{
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                        paddingRight: '1rem',
                      }}
                    >
                      <LeaveRowActions leave={leaveObj} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Toolbar */}
        {sortedLeaves.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            padding: '0.875rem 1.25rem',
            borderTop: '1px solid var(--border-secondary)',
            background: 'rgba(15, 23, 42, 0.3)',
          }}>
            {/* Left: Rows Per Page Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              <span>Show</span>
              <select
                className="form-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  height: '32px',
                  padding: '0 0.5rem',
                  fontSize: '0.8rem',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  width: '72px',
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>per page</span>
              <span style={{ margin: '0 0.35rem' }}>•</span>
              <span>
                Showing {sortedLeaves.length === 0 ? 0 : (activePage - 1) * pageSize + 1}–{Math.min(activePage * pageSize, sortedLeaves.length)} of {sortedLeaves.length}
              </span>
            </div>

            {/* Right: Page Navigation Buttons */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={activePage === 1}
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    opacity: activePage === 1 ? 0.4 : 1,
                    cursor: activePage === 1 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <ChevronLeft size={14} /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - activePage) <= 1)
                  .map((p, idx, arr) => {
                    const prevP = arr[idx - 1];
                    const showEllipsis = prevP && p - prevP > 1;
                    return (
                      <span key={p} style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {showEllipsis && <span style={{ padding: '0 0.35rem', color: 'var(--text-tertiary)' }}>...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          style={{
                            minWidth: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: p === activePage ? '1px solid #6366f1' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: p === activePage ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                            color: p === activePage ? '#ffffff' : 'var(--text-secondary)',
                            fontWeight: p === activePage ? 700 : 500,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}

                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={activePage === totalPages}
                  className="btn btn-ghost btn-sm"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.78rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    opacity: activePage === totalPages ? 0.4 : 1,
                    cursor: activePage === totalPages ? 'not-allowed' : 'pointer',
                  }}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
