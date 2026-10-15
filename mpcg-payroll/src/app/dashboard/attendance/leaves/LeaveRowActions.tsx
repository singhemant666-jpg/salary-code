'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateLeaveStatus, deleteLeave, sendLeaveWhatsAppNotificationManually } from '@/actions/leaves';
import ApproveLeaveModal from './ApproveLeaveModal';
import { Check, X, Trash2, MessageCircle } from 'lucide-react';

interface LeaveRowActionsProps {
  leave: {
    id: string;
    status: string;
    employeeName: string;
    employeeId: string;
    mobileNumber?: string | null;
    fromDateStr: string;
    toDateStr: string;
    fromDateRaw: string;
    toDateRaw: string;
    leaveType: string;
  };
}

export default function LeaveRowActions({ leave }: LeaveRowActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;
    setLoading(true);
    const res = await updateLeaveStatus(leave.id, 'REJECTED', undefined, undefined, reason);
    if (res.success) {
      if (res.whatsappUrl && !res.whatsappSent) {
        if (confirm('Leave application rejected. Would you like to open WhatsApp to notify the employee?')) {
          window.open(res.whatsappUrl, '_blank');
        }
      } else {
        alert(res.message);
      }
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    setLoading(true);
    const res = await updateLeaveStatus(leave.id, 'CANCELLED');
    if (res.success) {
      if (res.whatsappUrl && !res.whatsappSent) {
        if (confirm('Leave cancelled. Would you like to open WhatsApp to notify the employee?')) {
          window.open(res.whatsappUrl, '_blank');
        }
      } else {
        alert(res.message);
      }
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  const handleWhatsApp = async () => {
    setLoading(true);
    const res = await sendLeaveWhatsAppNotificationManually(leave.id);
    setLoading(false);
    if (res.whatsappUrl && !res.whatsappSent) {
      window.open(res.whatsappUrl, '_blank');
    }
    alert(res.message);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this leave record?')) return;
    setLoading(true);
    const res = await deleteLeave(leave.id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
        {leave.status === 'PENDING' && (
          <>
            <button
              onClick={() => setIsApproveModalOpen(true)}
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
              title="Approve Leave Options"
            >
              <Check size={13} /> Approve
            </button>
            <button
              onClick={handleReject}
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

        {leave.status === 'APPROVED' && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            title="Cancel Approved Leave"
          >
            Cancel
          </button>
        )}

        <button
          onClick={handleWhatsApp}
          disabled={loading}
          className="btn btn-sm"
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: 'rgba(37, 211, 102, 0.12)',
            color: '#25D366',
            border: '1px solid rgba(37, 211, 102, 0.35)',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
          title="Send WhatsApp leave update to employee"
        >
          <MessageCircle size={13} /> WhatsApp
        </button>

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

      <ApproveLeaveModal
        leave={leave}
        isOpen={isApproveModalOpen}
        onClose={() => setIsApproveModalOpen(false)}
        onSuccess={() => router.refresh()}
      />
    </>
  );
}
