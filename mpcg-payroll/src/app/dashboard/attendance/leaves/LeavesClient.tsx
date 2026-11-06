'use client';
import ClashDetailsModal from './ClashDetailsModal';

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

// Helper: Format clean short Title Case names (e.g. KHUSHBOO AMAR VIRA -> Khushboo Vira)
function formatShortName(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) {
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
  }
  const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  const last = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1).toLowerCase();
  return `${first} ${last}`;
}

// Helper: Format application date cleanly (e.g. "03 Nov 2026")
function formatAppliedDate(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

// Helper: Format full application timestamp (e.g. "03 Nov 2026, 07:36 PM")
function formatAppliedDateTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}

export default function LeavesClient({ initialLeaves, employees }: LeavesClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, PENDING, APPROVED, REJECTED, CANCELLED
  const [typeFilter, setTypeFilter] = useState<string>('ALL'); // ALL, PAID_LEAVE, UNPAID_LEAVE, HALF_DAY
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [datePreset, setDatePreset] = useState<string>('ALL'); // ALL, THIS_MONTH, LAST_MONTH, TODAY, UPCOMING, CUSTOM
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // ALL, or 'YYYY-MM'
  const [monthFilterBasis, setMonthFilterBasis] = useState<'LEAVE_DATE' | 'APPLIED_DATE'>('LEAVE_DATE');
  const [startDate, setStartDate] = useState<string>(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>(''); // YYYY-MM-DD

  // Organization & Sorting
  const [sortBy, setSortBy] = useState<string>('PENDING_FIRST'); // PENDING_FIRST, DATE_DESC, DATE_ASC, NAME_ASC, DAYS_DESC

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [activeClashModal, setActiveClashModal] = useState<{ leave: LeaveItem; clashes: any[] } | null>(null);

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

  // Unique months available across leave applications
  const availableMonths = useMemo(() => {
    const monthMap = new Map<string, { label: string; countByLeaveDate: number; countByAppliedDate: number }>();

    const getMonthLabel = (ym: string) => {
      const [year, month] = ym.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    };

    initialLeaves.forEach((l) => {
      // 1. Leave Dates month
      if (l.fromDateRaw) {
        const ymFrom = l.fromDateRaw.slice(0, 7);
        if (!monthMap.has(ymFrom)) {
          monthMap.set(ymFrom, { label: getMonthLabel(ymFrom), countByLeaveDate: 0, countByAppliedDate: 0 });
        }
        monthMap.get(ymFrom)!.countByLeaveDate += 1;
      }
      if (l.toDateRaw && l.toDateRaw.slice(0, 7) !== l.fromDateRaw?.slice(0, 7)) {
        const ymTo = l.toDateRaw.slice(0, 7);
        if (!monthMap.has(ymTo)) {
          monthMap.set(ymTo, { label: getMonthLabel(ymTo), countByLeaveDate: 0, countByAppliedDate: 0 });
        }
        monthMap.get(ymTo)!.countByLeaveDate += 1;
      }
      // 2. Applied Date month
      if (l.createdAt) {
        const ymApp = l.createdAt.slice(0, 7);
        if (!monthMap.has(ymApp)) {
          monthMap.set(ymApp, { label: getMonthLabel(ymApp), countByLeaveDate: 0, countByAppliedDate: 0 });
        }
        monthMap.get(ymApp)!.countByAppliedDate += 1;
      }
    });

    return Array.from(monthMap.entries())
      .map(([ym, data]) => ({ ym, ...data }))
      .sort((a, b) => b.ym.localeCompare(a.ym));
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

      // 4. Month Filter
      if (selectedMonth !== 'ALL') {
        if (monthFilterBasis === 'APPLIED_DATE') {
          if (!leave.createdAt || !leave.createdAt.startsWith(selectedMonth)) {
            return false;
          }
        } else {
          // LEAVE_DATE: Leave dates overlap with this month
          const [yearStr, monthStr] = selectedMonth.split('-');
          const y = parseInt(yearStr, 10);
          const m = parseInt(monthStr, 10);
          const monthStart = `${selectedMonth}-01`;
          const lastDayNum = new Date(y, m, 0).getDate();
          const monthEnd = `${selectedMonth}-${String(lastDayNum).padStart(2, '0')}`;

          if (leave.fromDateRaw > monthEnd || leave.toDateRaw < monthStart) {
            return false;
          }
        }
      }

      // 5. Date Range Filter
      if (startDate && leave.toDateRaw < startDate) {
        return false;
      }
      if (endDate && leave.fromDateRaw > endDate) {
        return false;
      }

      // 6. Search Query
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
  }, [initialLeaves, statusFilter, typeFilter, departmentFilter, selectedMonth, monthFilterBasis, startDate, endDate, searchTerm]);

  // Calculate date clashes across leave applications (same-day overlaps)
  const clashMap = useMemo(() => {
    const map = new Map<string, Array<{
      id: string;
      employeeName: string;
      employeeId: string;
      department?: string | null;
      status: string;
      fromDateStr: string;
      toDateStr: string;
      isSameDepartment?: boolean;
    }>>();

    for (let i = 0; i < initialLeaves.length; i++) {
      const a = initialLeaves[i];
      if (a.status !== 'PENDING' && a.status !== 'APPROVED') continue;

      const clashes: any[] = [];
      for (let j = 0; j < initialLeaves.length; j++) {
        if (i === j) continue;
        const b = initialLeaves[j];
        if (b.status !== 'PENDING' && b.status !== 'APPROVED') continue;
        if (a.employeeId === b.employeeId) continue;

        // Date range overlap check: a.from <= b.to && a.to >= b.from
        if (a.fromDateRaw <= b.toDateRaw && a.toDateRaw >= b.fromDateRaw) {
          clashes.push({
            id: b.id,
            employeeName: b.employee.name,
            employeeId: b.employee.employeeId,
            department: b.employee.department,
            status: b.status,
            fromDateStr: b.fromDateStr,
            toDateStr: b.toDateStr,
            isSameDepartment: Boolean(a.employee.department && a.employee.department === b.employee.department),
          });
        }
      }

      if (clashes.length > 0) {
        map.set(a.id, clashes);
      }
    }

    return map;
  }, [initialLeaves]);

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
      if (sortBy === 'APPLIED_DESC') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      if (sortBy === 'APPLIED_ASC') {
        return (a.createdAt || '').localeCompare(b.createdAt || '');
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
    selectedMonth !== 'ALL' ||
    datePreset !== 'ALL' ||
    startDate !== '' ||
    endDate !== '' ||
    sortBy !== 'PENDING_FIRST';

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setDepartmentFilter('ALL');
    setSelectedMonth('ALL');
    setMonthFilterBasis('LEAVE_DATE');
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
        @keyframes clashPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.45);
            border-color: rgba(239, 68, 68, 0.45);
          }
          50% {
            box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
            border-color: rgba(239, 68, 68, 0.85);
          }
        }
        @keyframes beaconPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.4);
          }
        }
        .clash-pulse-card {
          animation: clashPulse 2.2s infinite ease-in-out;
          transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }
        .clash-pulse-card:hover {
          transform: translateY(-1px) scale(1.02);
          background: rgba(239, 68, 68, 0.22) !important;
          border-color: rgba(239, 68, 68, 0.9) !important;
        }
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
        /* Leave Filter Box Container */
        .leave-filter-container {
          padding: 1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
          border-radius: 14px;
          border: 1px solid var(--border-secondary, rgba(255, 255, 255, 0.12));
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        [data-theme="light"] .leave-filter-container {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) !important;
        }

        /* Filter Form Inputs inside leave filter bar */
        .leave-ctrl-input {
          height: 42px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: var(--text-primary);
          transition: all 0.15s ease;
        }
        [data-theme="light"] .leave-ctrl-input {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
        }
        [data-theme="light"] .leave-ctrl-input:hover {
          border-color: #94a3b8 !important;
        }
        [data-theme="light"] .leave-ctrl-input:focus {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15) !important;
        }
        [data-theme="light"] .leave-ctrl-input::placeholder {
          color: #94a3b8 !important;
        }

        /* Date range labels ("From", "To") */
        .leave-date-tag {
          position: absolute;
          left: 0.65rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.68rem;
          color: var(--text-tertiary);
          pointer-events: none;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        [data-theme="light"] .leave-date-tag {
          color: #475569 !important;
          font-weight: 800 !important;
        }

        /* Status filter row separator */
        .leave-filter-sep {
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        [data-theme="light"] .leave-filter-sep {
          border-top: 1px solid #e2e8f0 !important;
        }

        /* Status filter label */
        .leave-status-title {
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          margin-right: 0.35rem;
        }
        [data-theme="light"] .leave-status-title {
          color: #334155 !important;
          font-weight: 800 !important;
        }

        /* Status Filter Buttons */
        .status-pill-btn {
          padding: 0.35rem 0.8rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          gap: 0.45rem;
        }

        /* Pill - ALL */
        .status-pill-all {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
        }
        .status-pill-all.active {
          border: 1.5px solid #6366f1;
          background: rgba(99, 102, 241, 0.18);
          color: #a5b4fc;
        }
        [data-theme="light"] .status-pill-all {
          border: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          color: #475569 !important;
        }
        [data-theme="light"] .status-pill-all.active {
          border: 1.5px solid #6366f1 !important;
          background: #eef2ff !important;
          color: #4338ca !important;
          font-weight: 700 !important;
        }

        /* Pill - PENDING */
        .status-pill-pending {
          border: 1px solid rgba(234, 179, 8, 0.2);
          background: rgba(234, 179, 8, 0.05);
          color: #ca8a04;
        }
        .status-pill-pending.active {
          border: 1.5px solid #eab308;
          background: rgba(234, 179, 8, 0.2);
          color: #facc15;
        }
        [data-theme="light"] .status-pill-pending {
          border: 1px solid #fde68a !important;
          background: #fffbeb !important;
          color: #b45309 !important;
        }
        [data-theme="light"] .status-pill-pending.active {
          border: 1.5px solid #d97706 !important;
          background: #fefce8 !important;
          color: #92400e !important;
          font-weight: 700 !important;
        }

        /* Pill - APPROVED */
        .status-pill-approved {
          border: 1px solid rgba(34, 197, 94, 0.2);
          background: rgba(34, 197, 94, 0.05);
          color: #16a34a;
        }
        .status-pill-approved.active {
          border: 1.5px solid #22c55e;
          background: rgba(34, 197, 94, 0.2);
          color: #4ade80;
        }
        [data-theme="light"] .status-pill-approved {
          border: 1px solid #bbf7d0 !important;
          background: #f0fdf4 !important;
          color: #15803d !important;
        }
        [data-theme="light"] .status-pill-approved.active {
          border: 1.5px solid #16a34a !important;
          background: #dcfce7 !important;
          color: #166534 !important;
          font-weight: 700 !important;
        }

        /* Pill - REJECTED */
        .status-pill-rejected {
          border: 1px solid rgba(239, 68, 68, 0.2);
          background: rgba(239, 68, 68, 0.05);
          color: #dc2626;
        }
        .status-pill-rejected.active {
          border: 1.5px solid #ef4444;
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }
        [data-theme="light"] .status-pill-rejected {
          border: 1px solid #fecaca !important;
          background: #fef2f2 !important;
          color: #b91c1c !important;
        }
        [data-theme="light"] .status-pill-rejected.active {
          border: 1.5px solid #dc2626 !important;
          background: #fee2e2 !important;
          color: #991b1b !important;
          font-weight: 700 !important;
        }

        /* Pill - CANCELLED */
        .status-pill-cancelled {
          border: 1px solid rgba(100, 116, 139, 0.2);
          background: rgba(100, 116, 139, 0.05);
          color: #94a3b8;
        }
        .status-pill-cancelled.active {
          border: 1.5px solid #64748b;
          background: rgba(100, 116, 139, 0.2);
          color: #cbd5e1;
        }
        [data-theme="light"] .status-pill-cancelled {
          border: 1px solid #e2e8f0 !important;
          background: #f8fafc !important;
          color: #64748b !important;
        }
        [data-theme="light"] .status-pill-cancelled.active {
          border: 1.5px solid #475569 !important;
          background: #f1f5f9 !important;
          color: #1e293b !important;
          font-weight: 700 !important;
        }

        /* Pill badge counts */
        .pill-badge {
          font-size: 0.7rem;
          padding: 0.1rem 0.45rem;
          border-radius: 10px;
          font-weight: 700;
        }
        .pill-badge-all {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-tertiary);
        }
        .pill-badge-all.active {
          background: rgba(99, 102, 241, 0.4);
          color: #ffffff;
        }
        [data-theme="light"] .pill-badge-all {
          background: #e2e8f0 !important;
          color: #475569 !important;
        }
        [data-theme="light"] .pill-badge-all.active {
          background: #6366f1 !important;
          color: #ffffff !important;
        }
        .pill-badge-pending {
          background: rgba(234, 179, 8, 0.18);
          color: #eab308;
        }
        .pill-badge-pending.active {
          background: #eab308;
          color: #000000;
        }
        [data-theme="light"] .pill-badge-pending {
          background: #fef08a !important;
          color: #854d0e !important;
        }
        [data-theme="light"] .pill-badge-pending.active {
          background: #d97706 !important;
          color: #ffffff !important;
        }
        .pill-badge-approved {
          background: rgba(34, 197, 94, 0.18);
          color: #22c55e;
        }
        .pill-badge-approved.active {
          background: #22c55e;
          color: #ffffff;
        }
        [data-theme="light"] .pill-badge-approved {
          background: #dcfce7 !important;
          color: #166534 !important;
        }
        [data-theme="light"] .pill-badge-approved.active {
          background: #16a34a !important;
          color: #ffffff !important;
        }
        .pill-badge-rejected {
          background: rgba(239, 68, 68, 0.18);
          color: #ef4444;
        }
        .pill-badge-rejected.active {
          background: #ef4444;
          color: #ffffff;
        }
        [data-theme="light"] .pill-badge-rejected {
          background: #fee2e2 !important;
          color: #991b1b !important;
        }
        [data-theme="light"] .pill-badge-rejected.active {
          background: #dc2626 !important;
          color: #ffffff !important;
        }
        .pill-badge-cancelled {
          background: rgba(100, 116, 139, 0.18);
          color: #94a3b8;
        }
        .pill-badge-cancelled.active {
          background: #64748b;
          color: #ffffff;
        }
        [data-theme="light"] .pill-badge-cancelled {
          background: #e2e8f0 !important;
          color: #475569 !important;
        }
        [data-theme="light"] .pill-badge-cancelled.active {
          background: #475569 !important;
          color: #ffffff !important;
        }

        /* Results Counter in Filter Bar */
        .leave-results-count {
          font-size: 0.8rem;
          color: var(--text-tertiary);
          font-weight: 500;
        }
        [data-theme="light"] .leave-results-count {
          color: #475569 !important;
          font-weight: 600 !important;
        }
        [data-theme="light"] .leave-results-count strong {
          color: #0f172a !important;
          font-weight: 800 !important;
        }

        /* Reset button */
        [data-theme="light"] .leave-reset-btn {
          background: #f1f5f9 !important;
          border-color: #cbd5e1 !important;
          color: #334155 !important;
        }
        [data-theme="light"] .leave-reset-btn:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }

        /* Active date pill */
        .leave-active-date-pill {
          font-size: 0.72rem;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.25);
          color: #a5b4fc;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-weight: 600;
        }
        [data-theme="light"] .leave-active-date-pill {
          background: #eef2ff !important;
          border: 1px solid #c7d2fe !important;
          color: #4338ca !important;
          font-weight: 700 !important;
        }

        /* Employee ID Badge */
        .employee-id-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 0.25rem 0.55rem;
          border-radius: 6px;
          color: #cbd5e1;
          font-weight: 700;
          letter-spacing: 0.04em;
          display: inline-block;
          white-space: nowrap;
          font-family: monospace;
          font-size: 0.75rem;
        }
        [data-theme="light"] .employee-id-pill {
          background: #f1f5f9 !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
          font-weight: 800 !important;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        }

        /* Employee Dept Pill */
        .employee-dept-pill {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-tertiary);
          padding: 0.05rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
        }
        [data-theme="light"] .employee-dept-pill {
          background: #e2e8f0 !important;
          color: #334155 !important;
          font-weight: 600 !important;
        }

        /* Duration Badges */
        .leave-duration-badge-full {
          font-size: 0.72rem;
          padding: 0.12rem 0.55rem;
          border-radius: 12px;
          font-weight: 700;
          display: inline-block;
          letter-spacing: 0.02em;
          background: rgba(6, 182, 212, 0.12);
          color: #22d3ee;
          border: 1px solid rgba(6, 182, 212, 0.25);
        }
        [data-theme="light"] .leave-duration-badge-full {
          background: #e0f2fe !important;
          color: #0284c7 !important;
          border: 1px solid #7dd3fc !important;
        }
        .leave-duration-badge-half {
          font-size: 0.72rem;
          padding: 0.12rem 0.55rem;
          border-radius: 12px;
          font-weight: 700;
          display: inline-block;
          letter-spacing: 0.02em;
          background: rgba(244, 63, 94, 0.12);
          color: #fb7185;
          border: 1px solid rgba(244, 63, 94, 0.25);
        }
        [data-theme="light"] .leave-duration-badge-half {
          background: #ffe4e6 !important;
          color: #be123c !important;
          border: 1px solid #fda4af !important;
        }

        /* Clash Card Styling in Table */
        .clash-pulse-card {
          font-size: 0.67rem;
          padding: 0.28rem 0.55rem;
          border-radius: 7px;
          background: rgba(239, 68, 68, 0.14);
          border: 1px solid rgba(239, 68, 68, 0.45);
          color: #f87171;
          line-height: 1.35;
          cursor: pointer;
        }
        [data-theme="light"] .clash-pulse-card {
          background: #fef2f2 !important;
          border: 1.5px solid #f87171 !important;
          color: #b91c1c !important;
          box-shadow: 0 1px 4px rgba(239, 68, 68, 0.15) !important;
        }
        [data-theme="light"] .clash-pulse-card:hover {
          background: #fee2e2 !important;
          border-color: #ef4444 !important;
        }
        .clash-title-text {
          color: #f87171;
        }
        [data-theme="light"] .clash-title-text {
          color: #b91c1c !important;
          font-weight: 800 !important;
        }
        .clash-view-link {
          font-size: 0.6rem;
          color: #fda4af;
          text-decoration: underline;
          margin-left: auto;
          font-weight: 600;
        }
        [data-theme="light"] .clash-view-link {
          color: #dc2626 !important;
          font-weight: 700 !important;
        }
        .clash-with-text {
          color: #fda4af;
          font-weight: 500;
          font-size: 0.64rem;
          margin-right: 1px;
        }
        [data-theme="light"] .clash-with-text {
          color: #991b1b !important;
          font-weight: 700 !important;
        }
        .clash-name-chip-diff {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #ffffff;
          font-size: 0.64rem;
          font-weight: 600;
          white-space: nowrap;
        }
        [data-theme="light"] .clash-name-chip-diff {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #0f172a !important;
          font-weight: 700 !important;
        }
        .clash-name-chip-same {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(239, 68, 68, 0.28);
          border: 1px solid rgba(239, 68, 68, 0.55);
          color: #ffffff;
          font-size: 0.64rem;
          font-weight: 600;
          white-space: nowrap;
        }
        [data-theme="light"] .clash-name-chip-same {
          background: #fee2e2 !important;
          border: 1px solid #f87171 !important;
          color: #991b1b !important;
          font-weight: 700 !important;
        }
        .clash-more-chip {
          display: inline-flex;
          align-items: center;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(239, 68, 68, 0.22);
          border: 1px dashed rgba(239, 68, 68, 0.65);
          color: #fecaca;
          font-size: 0.62rem;
          font-weight: 700;
          white-space: nowrap;
        }
        [data-theme="light"] .clash-more-chip {
          background: #fee2e2 !important;
          border: 1px dashed #ef4444 !important;
          color: #991b1b !important;
          font-weight: 700 !important;
        }

        /* Leave Type Badges in Table */
        .leave-type-pill {
          font-weight: 700;
          font-size: 0.72rem;
          letter-spacing: 0.03em;
          padding: 0.25rem 0.65rem;
          border-radius: 12px;
          white-space: nowrap;
          display: inline-block;
        }
        .leave-type-paid {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.25);
        }
        [data-theme="light"] .leave-type-paid {
          background: #d1fae5 !important;
          color: #047857 !important;
          border: 1px solid #6ee7b7 !important;
          font-weight: 800 !important;
        }
        .leave-type-unpaid {
          background: rgba(99, 102, 241, 0.12);
          color: #a5b4fc;
          border: 1px solid rgba(99, 102, 241, 0.25);
        }
        [data-theme="light"] .leave-type-unpaid {
          background: #e0e7ff !important;
          color: #4338ca !important;
          border: 1px solid #c7d2fe !important;
          font-weight: 800 !important;
        }

        /* Status Badges in Table */
        .leave-status-pill {
          white-space: nowrap;
          font-weight: 700;
          font-size: 0.72rem;
          letter-spacing: 0.03em;
          padding: 0.25rem 0.65rem;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .leave-status-badge-pending {
          background: rgba(234, 179, 8, 0.12);
          color: #facc15;
          border: 1px solid rgba(234, 179, 8, 0.28);
        }
        [data-theme="light"] .leave-status-badge-pending {
          background: #fef3c7 !important;
          color: #b45309 !important;
          border: 1px solid #fcd34d !important;
          font-weight: 800 !important;
        }
        .leave-status-badge-approved {
          background: rgba(16, 185, 129, 0.12);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.28);
        }
        [data-theme="light"] .leave-status-badge-approved {
          background: #dcfce7 !important;
          color: #15803d !important;
          border: 1px solid #86efac !important;
          font-weight: 800 !important;
        }
        .leave-status-badge-rejected {
          background: rgba(239, 68, 68, 0.12);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.28);
        }
        [data-theme="light"] .leave-status-badge-rejected {
          background: #fee2e2 !important;
          color: #b91c1c !important;
          border: 1px solid #fca5a5 !important;
          font-weight: 800 !important;
        }
        .leave-status-badge-cancelled {
          background: rgba(148, 163, 184, 0.12);
          color: #94a3b8;
          border: 1px solid rgba(148, 163, 184, 0.25);
        }
        [data-theme="light"] .leave-status-badge-cancelled {
          background: #f1f5f9 !important;
          color: #475569 !important;
          border: 1px solid #cbd5e1 !important;
          font-weight: 800 !important;
        }

        /* Table container and pagination in Light Mode */
        .leave-table-card {
          border-radius: 14px;
          overflow-x: auto;
          position: relative;
          border: 1px solid var(--border-primary);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
          background: var(--bg-card);
        }
        [data-theme="light"] .leave-table-card {
          border: 1px solid #e2e8f0 !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05) !important;
          background: #ffffff !important;
        }

        .leave-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 0.875rem 1.25rem;
          border-top: 1px solid var(--border-secondary);
          background: rgba(15, 23, 42, 0.3);
        }
        [data-theme="light"] .leave-pagination-bar {
          background: #f8fafc !important;
          border-top: 1px solid #e2e8f0 !important;
          color: #475569 !important;
        }

        .leave-page-btn {
          min-width: 32px;
          height: 32px;
          border-radius: 6px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          color: var(--text-secondary);
        }
        .leave-page-btn.active {
          border: 1px solid #6366f1;
          background: rgba(99, 102, 241, 0.25);
          color: #ffffff;
          font-weight: 700;
        }
        [data-theme="light"] .leave-page-btn {
          border: 1px solid #e2e8f0 !important;
          background: #f1f5f9 !important;
          color: #475569 !important;
        }
        [data-theme="light"] .leave-page-btn.active {
          border: 1px solid #6366f1 !important;
          background: #6366f1 !important;
          color: #ffffff !important;
        }
        [data-theme="light"] .leave-page-btn:hover:not(.active) {
          background: #e2e8f0 !important;
          color: #0f172a !important;
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
        className="leave-filter-container"
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
              className="form-input leave-ctrl-input"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search employee name, ID, phone, reason..."
              style={{
                paddingLeft: '2.4rem',
                paddingRight: searchTerm ? '2.4rem' : '1rem',
                width: '100%',
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
              className="form-select leave-ctrl-input"
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
              style={{
                border: typeFilter !== 'ALL' ? '1.5px solid #6366f1' : undefined,
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
                className="form-select leave-ctrl-input"
                value={departmentFilter}
                onChange={(e) => { setDepartmentFilter(e.target.value); setCurrentPage(1); }}
                style={{
                  border: departmentFilter !== 'ALL' ? '1.5px solid #6366f1' : undefined,
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

          {/* Month Filter */}
          <div style={{ minWidth: '150px', flex: '0 1 165px' }}>
            <select
              className="form-select leave-ctrl-input"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                border: selectedMonth !== 'ALL' ? '1.5px solid #8b5cf6' : undefined,
                fontSize: '0.85rem',
                fontWeight: selectedMonth !== 'ALL' ? 700 : 400,
              }}
              title="Filter leave records month by month"
            >
              <option value="ALL">🗓️ All Months</option>
              {availableMonths.map((m) => {
                const count = monthFilterBasis === 'APPLIED_DATE' ? m.countByAppliedDate : m.countByLeaveDate;
                return (
                  <option key={m.ym} value={m.ym}>
                    {m.label} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Month Filter Basis Toggle */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              padding: '2px',
              height: '42px',
            }}
            title="Choose whether month filtering matches leave dates or employee submission date"
          >
            <button
              type="button"
              onClick={() => setMonthFilterBasis('LEAVE_DATE')}
              style={{
                border: 'none',
                background: monthFilterBasis === 'LEAVE_DATE' ? '#6366f1' : 'transparent',
                color: monthFilterBasis === 'LEAVE_DATE' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.74rem',
                fontWeight: monthFilterBasis === 'LEAVE_DATE' ? 700 : 500,
                borderRadius: '6px',
                padding: '0.35rem 0.55rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              title="Filter month by when the leave occurs"
            >
              📅 Leave
            </button>
            <button
              type="button"
              onClick={() => setMonthFilterBasis('APPLIED_DATE')}
              style={{
                border: 'none',
                background: monthFilterBasis === 'APPLIED_DATE' ? '#8b5cf6' : 'transparent',
                color: monthFilterBasis === 'APPLIED_DATE' ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.74rem',
                fontWeight: monthFilterBasis === 'APPLIED_DATE' ? 700 : 500,
                borderRadius: '6px',
                padding: '0.35rem 0.55rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              title="Filter month by when the application was submitted"
            >
              🕒 Applied
            </button>
          </div>

          {/* Date Filter Preset */}
          <div style={{ minWidth: '140px', flex: '0 1 150px' }}>
            <select
              className="form-select leave-ctrl-input"
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              style={{
                border: datePreset !== 'ALL' ? '1.5px solid #6366f1' : undefined,
                fontSize: '0.85rem',
                fontWeight: datePreset !== 'ALL' ? 700 : 400,
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
              <span className="leave-date-tag">
                From
              </span>
              <input
                type="date"
                className="form-input leave-ctrl-input"
                value={startDate}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                style={{
                  paddingLeft: '3rem',
                  paddingRight: '0.5rem',
                  border: startDate ? '1.5px solid #6366f1' : undefined,
                  fontSize: '0.82rem',
                  width: '142px',
                }}
                title="Filter leaves active on or after this date"
              />
            </div>

            <div style={{ position: 'relative' }}>
              <span className="leave-date-tag">
                To
              </span>
              <input
                type="date"
                className="form-input leave-ctrl-input"
                value={endDate}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                style={{
                  paddingLeft: '2.4rem',
                  paddingRight: '0.5rem',
                  border: endDate ? '1.5px solid #6366f1' : undefined,
                  fontSize: '0.82rem',
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
              className="form-select leave-ctrl-input"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                fontSize: '0.82rem',
                width: '100%',
              }}
              title="Organize list order"
            >
              <option value="PENDING_FIRST">⚡ Pending Action First</option>
              <option value="DATE_DESC">📅 Leave Date: Newest First</option>
              <option value="DATE_ASC">📅 Leave Date: Oldest First</option>
              <option value="APPLIED_DESC">🕒 Applied Date: Newest First</option>
              <option value="APPLIED_ASC">🕒 Applied Date: Oldest First</option>
              <option value="NAME_ASC">👤 Employee Name (A–Z)</option>
              <option value="DAYS_DESC">⏳ Duration: Longest First</option>
            </select>
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-ghost leave-reset-btn"
              style={{
                height: '42px',
                gap: '0.4rem',
                fontSize: '0.82rem',
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
        <div className="leave-filter-sep"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.65rem',
          paddingTop: '0.5rem',
        }}>
          {/* Status Buttons */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
            <span className="leave-status-title">
              Status:
            </span>

            {/* ALL */}
            <button
              type="button"
              onClick={() => { setStatusFilter('ALL'); setCurrentPage(1); }}
              className={`status-pill-btn status-pill-all ${statusFilter === 'ALL' ? 'active' : ''}`}
            >
              All Requests
              <span className={`pill-badge pill-badge-all ${statusFilter === 'ALL' ? 'active' : ''}`}>
                {totalCount}
              </span>
            </button>

            {/* PENDING */}
            <button
              type="button"
              onClick={() => handleCardClick('PENDING')}
              className={`status-pill-btn status-pill-pending ${statusFilter === 'PENDING' ? 'active' : ''}`}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#eab308' }} />
              Pending Review
              <span className={`pill-badge pill-badge-pending ${statusFilter === 'PENDING' ? 'active' : ''}`}>
                {pendingCount}
              </span>
            </button>

            {/* APPROVED */}
            <button
              type="button"
              onClick={() => handleCardClick('APPROVED')}
              className={`status-pill-btn status-pill-approved ${statusFilter === 'APPROVED' ? 'active' : ''}`}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
              Approved
              <span className={`pill-badge pill-badge-approved ${statusFilter === 'APPROVED' ? 'active' : ''}`}>
                {approvedCount}
              </span>
            </button>

            {/* REJECTED */}
            <button
              type="button"
              onClick={() => handleCardClick('REJECTED')}
              className={`status-pill-btn status-pill-rejected ${statusFilter === 'REJECTED' ? 'active' : ''}`}
            >
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#ef4444' }} />
              Rejected
              <span className={`pill-badge pill-badge-rejected ${statusFilter === 'REJECTED' ? 'active' : ''}`}>
                {rejectedCount}
              </span>
            </button>

            {/* CANCELLED (if any) */}
            {cancelledCount > 0 && (
              <button
                type="button"
                onClick={() => handleCardClick('CANCELLED')}
                className={`status-pill-btn status-pill-cancelled ${statusFilter === 'CANCELLED' ? 'active' : ''}`}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#94a3b8' }} />
                Cancelled
                <span className={`pill-badge pill-badge-cancelled ${statusFilter === 'CANCELLED' ? 'active' : ''}`}>
                  {cancelledCount}
                </span>
              </button>
            )}
          </div>

          {/* Results Summary & Active Dates Tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {(startDate || endDate) && (
              <span className="leave-active-date-pill">
                📅 {startDate ? `From ${startDate}` : ''} {endDate ? `To ${endDate}` : ''}
              </span>
            )}
            <div className="leave-results-count">
              Showing <strong style={{ color: 'var(--text-primary)' }}>{sortedLeaves.length}</strong> of {totalCount} requests
            </div>
          </div>
        </div>
      </div>

      {/* Main Leave Applications Table Card */}
      <div
        className="table-container leave-table-container leave-table-card"
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

                const clashes = clashMap.get(leave.id) || [];

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
                  createdAt: leave.createdAt,
                  clashes,
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
                              <span className="employee-dept-pill">
                                {leave.employee.department}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Employee ID with nowrap */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="employee-id-pill font-mono text-xs">
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
                        <span className={duration.isHalf ? 'leave-duration-badge-half' : 'leave-duration-badge-full'}>
                          {duration.label}
                        </span>
                      </div>

                      {leave.createdAt && (
                        <div
                          style={{
                            fontSize: '0.72rem',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            marginTop: '0.3rem',
                          }}
                          title={`Leave application submitted on: ${formatAppliedDateTime(leave.createdAt)}`}
                        >
                          <Clock size={11} style={{ color: '#8b5cf6', flexShrink: 0 }} />
                          <span>
                            Applied: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatAppliedDate(leave.createdAt)}</strong>
                          </span>
                        </div>
                      )}

                      {clashes.length > 0 && (
                        <div style={{ marginTop: '0.35rem', maxWidth: '280px' }}>
                          <div
                            className="clash-pulse-card"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveClashModal({ leave, clashes });
                            }}
                            style={{
                              fontSize: '0.67rem',
                              padding: '0.28rem 0.55rem',
                              borderRadius: '7px',
                              background: 'rgba(239, 68, 68, 0.14)',
                              border: '1px solid rgba(239, 68, 68, 0.45)',
                              color: '#f87171',
                              lineHeight: 1.35,
                              cursor: 'pointer',
                            }}
                            title="Date Conflict: Click to view details"
                          >
                            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px' }}>
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: '#ef4444',
                                  display: 'inline-block',
                                  boxShadow: '0 0 8px #ef4444',
                                  animation: 'beaconPulse 1.4s infinite ease-in-out',
                                  flexShrink: 0,
                                }}
                              />
                              <span className="clash-title-text">⚠️ Clash ({clashes.length + 1} on same date)</span>
                              <span className="clash-view-link">
                                View ↗
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '3px', alignItems: 'center' }}>
                              <span className="clash-with-text">with</span>
                              {clashes.slice(0, 2).map((c) => (
                                <span
                                  key={c.id}
                                  className={c.isSameDepartment ? 'clash-name-chip-same' : 'clash-name-chip-diff'}
                                  title={`${c.employeeName} (${c.employeeId}) · ${c.department || 'Staff'}`}
                                >
                                  {c.isSameDepartment && (
                                    <span
                                      style={{
                                        width: '4px',
                                        height: '4px',
                                        borderRadius: '50%',
                                        background: '#f87171',
                                        display: 'inline-block',
                                      }}
                                    />
                                  )}
                                  <span>{formatShortName(c.employeeName)}</span>
                                </span>
                              ))}

                              {clashes.length > 2 && (
                                <span
                                  className="clash-more-chip"
                                  title={`+${clashes.length - 2} more: ${clashes.slice(2).map(c => c.employeeName).join(', ')}`}
                                >
                                  +{clashes.length - 2} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 4. Leave Type */}
                    <td>
                      <span
                        className={`leave-type-pill ${leave.leaveType === 'PAID_LEAVE' ? 'leave-type-paid' : 'leave-type-unpaid'}`}
                      >
                        {leave.leaveType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    {/* 5. Status with pill */}
                    <td>
                      <span
                        className={`leave-status-pill ${leave.status === 'PENDING' ? 'leave-status-badge-pending' : leave.status === 'APPROVED' ? 'leave-status-badge-approved' : leave.status === 'REJECTED' ? 'leave-status-badge-rejected' : 'leave-status-badge-cancelled'}`}
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
          <div className="leave-pagination-bar">
            {/* Left: Rows Per Page Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              <span>Show</span>
              <select
                className="form-select leave-ctrl-input"
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
                  className="btn btn-ghost btn-sm leave-page-btn"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.78rem',
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
                          className={`leave-page-btn ${p === activePage ? 'active' : ''}`}
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
                  className="btn btn-ghost btn-sm leave-page-btn"
                  style={{
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.78rem',
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

      {/* Interactive Pulse Clash Details Modal */}
      <ClashDetailsModal
        isOpen={Boolean(activeClashModal)}
        onClose={() => setActiveClashModal(null)}
        leave={activeClashModal?.leave || null}
        clashes={activeClashModal?.clashes || []}
      />
    </div>
  );
}
