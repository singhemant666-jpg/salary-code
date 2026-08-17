'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateLeaveStatus, deleteLeave } from '@/actions/leaves';
import { Check, X, Trash2 } from 'lucide-react';

export default function LeaveRowActions({
  leaveId,
  status,
}: {
  leaveId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStatus = async (newStatus: 'APPROVED' | 'REJECTED' | 'CANCELLED') => {
    setLoading(true);
    const res = await updateLeaveStatus(leaveId, newStatus);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this leave record?')) return;
    setLoading(true);
    const res = await deleteLeave(leaveId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
      {status === 'PENDING' && (
        <>
          <button
            onClick={() => handleStatus('APPROVED')}
            disabled={loading}
            className="btn btn-sm"
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Approve Leave"
          >
            <Check size={13} /> Approve
          </button>
          <button
            onClick={() => handleStatus('REJECTED')}
            disabled={loading}
            className="btn btn-sm"
            style={{
              padding: '0.25rem 0.5rem',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
            title="Reject Leave"
          >
            <X size={13} /> Reject
          </button>
        </>
      )}

      {status === 'APPROVED' && (
        <button
          onClick={() => handleStatus('CANCELLED')}
          disabled={loading}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
          title="Cancel Approved Leave"
        >
          Cancel
        </button>
      )}

      <button
        onClick={handleDelete}
        disabled={loading}
        className="btn btn-ghost btn-icon btn-sm"
        style={{ padding: '0.25rem', color: '#ef4444' }}
        title="Delete Leave Record"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
