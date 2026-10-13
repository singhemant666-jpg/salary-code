'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approveShiftOverride, rejectShiftOverride, deleteShiftOverride } from '@/actions/shift-overrides';
import { Check, X, Trash2, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface ShiftApprovalActionsProps {
  id: string;
  status: string; // 'PENDING' | 'APPROVED' | 'REJECTED'
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
    if (!confirm(`Delete this shift timing override record for ${employeeName}?`)) {
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
          title="Delete Shift Override"
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
            title="Delete Record"
          >
            <Trash2 size={15} />
          </button>
        </>
      )}
    </div>
  );
}
