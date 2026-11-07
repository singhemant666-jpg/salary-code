'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveShiftOverride,
  rejectShiftOverride,
  deleteShiftOverride,
  restoreShiftOverride,
  permanentDeleteShiftOverride,
} from '@/actions/shift-overrides';
import { Check, X, Trash2, Loader2, RotateCcw } from 'lucide-react';

interface ShiftApprovalActionsProps {
  id: string;
  status: string; // 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELETED'
  employeeName: string;
}

export default function ShiftApprovalActions({
  id,
  status,
  employeeName,
}: ShiftApprovalActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    if (!confirm(`Approve shift timing override for ${employeeName}? Attendance and late penalties for these dates will be updated automatically.`)) {
      return;
    }

    setLoading(true);
    const res = await approveShiftOverride(id);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handleReject = async () => {
    const reason = prompt(`Reject shift timing override for ${employeeName}? Enter reason (optional):`);
    if (reason === null) return; // cancelled

    setLoading(true);
    const res = await rejectShiftOverride(id, reason || undefined);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete shift timing override for ${employeeName}?` +
      `\n\nNote: The record will be safely saved in the "Deleted" records archive and can be restored at any time. Attendance for affected dates will be recalculated.`)) {
      return;
    }

    setLoading(true);
    const res = await deleteShiftOverride(id);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handleRestore = async () => {
    if (!confirm(`Restore this shift timing override for ${employeeName}? The custom shift timing will be re-applied and attendance will be recalculated automatically.`)) {
      return;
    }

    setLoading(true);
    const res = await restoreShiftOverride(id);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirm(`Warning: Are you sure you want to PERMANENTLY remove this shift timing override for ${employeeName} from the database? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const res = await permanentDeleteShiftOverride(id);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
        <Loader2 size={16} className="animate-spin" />
        <span style={{ fontSize: '0.75rem' }}>Processing...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
      {status === 'PENDING' && (
        <>
          <button
            type="button"
            onClick={handleApprove}
            className="btn btn-sm"
            style={{
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: '#059669',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
            }}
            title="Approve Shift Override (Late penalty will not deduct)"
          >
            <Check size={14} />
            Approve
          </button>

          <button
            type="button"
            onClick={handleReject}
            className="btn btn-sm"
            style={{
              padding: '0.25rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              cursor: 'pointer',
            }}
            title="Reject Shift Override"
          >
            <X size={14} />
            Reject
          </button>
        </>
      )}

      {status === 'APPROVED' && (
        <button
          type="button"
          onClick={handleDelete}
          className="btn btn-ghost btn-icon btn-sm"
          style={{ padding: '0.3rem', color: '#ef4444' }}
          title="Delete & Archive Shift Override (Record stays safely saved in Deleted archive)"
        >
          <Trash2 size={15} />
        </button>
      )}

      {status === 'REJECTED' && (
        <>
          <button
            type="button"
            onClick={handleApprove}
            className="btn btn-ghost btn-sm"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#10b981' }}
            title="Re-approve"
          >
            <Check size={14} />
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ padding: '0.3rem', color: '#ef4444' }}
            title="Delete & Archive"
          >
            <Trash2 size={15} />
          </button>
        </>
      )}

      {status === 'DELETED' && (
        <>
          <button
            type="button"
            onClick={handleRestore}
            className="btn btn-sm"
            style={{
              padding: '0.25rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer',
            }}
            title="Restore shift timing override (Re-applies custom hours and recalculates attendance)"
          >
            <RotateCcw size={13} />
            Restore
          </button>
          <button
            type="button"
            onClick={handlePermanentDelete}
            className="btn btn-ghost btn-icon btn-sm"
            style={{ padding: '0.3rem', color: '#6b7280' }}
            title="Permanently remove from database"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}
