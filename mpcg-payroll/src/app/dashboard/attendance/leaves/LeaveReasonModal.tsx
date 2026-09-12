'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { updateLeaveStatus } from '@/actions/leaves';
import { Eye, FileText, X, Check, AlertCircle } from 'lucide-react';

interface LeaveReasonModalProps {
  leave: {
    id: string;
    status: string;
    reason: string | null;
    employeeName: string;
    employeeId: string;
    department?: string | null;
    mobileNumber?: string | null;
    fromDateStr: string;
    toDateStr: string;
    leaveType: string;
    isHalfDay?: boolean;
    halfDayTime?: string | null;
  };
}

export default function LeaveReasonModal({ leave }: LeaveReasonModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStatusChange = async (newStatus: 'APPROVED' | 'REJECTED') => {
    setLoading(true);
    const res = await updateLeaveStatus(leave.id, newStatus);
    setLoading(false);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const fullReason = leave.reason || 'No detailed reason provided.';
  // Short preview snippet (first line or up to 60 chars)
  const snippet = fullReason.split('\n')[0].slice(0, 65);
  const isLong = fullReason.length > 65 || fullReason.includes('\n');

  const modalContent = isOpen ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.82)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '94%',
          maxWidth: '860px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.75rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem', background: 'rgba(99, 102, 241, 0.2)', padding: '0.45rem', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
              📄
            </span>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Formal Leave Application Letter
              </h3>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Application Details & Employee Reason Letter
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.5rem',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.75rem', overflowY: 'auto', display: 'grid', gap: '1.5rem', flex: 1 }}>
          {/* Employee Header Info */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '1.15rem 1.5rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '1rem',
            fontSize: '0.875rem'
          }}>
            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EMPLOYEE</span>
              <strong style={{ color: '#ffffff', fontSize: '1.05rem' }}>👤 {leave.employeeName}</strong>
              <span style={{ color: '#cbd5e1', fontSize: '0.825rem', display: 'block' }}>({leave.employeeId})</span>
            </div>

            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONTACT</span>
              <strong style={{ color: '#f1f5f9', fontSize: '0.95rem' }}>📱 {leave.mobileNumber || 'N/A'}</strong>
              {leave.department && <span style={{ color: '#94a3b8', fontSize: '0.8rem', display: 'block' }}>Dept: {leave.department}</span>}
            </div>

            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LEAVE DATES</span>
              <strong style={{ color: '#ffffff', fontSize: '0.95rem' }}>📅 {leave.fromDateStr}</strong>
              {leave.fromDateStr !== leave.toDateStr && <span style={{ color: '#cbd5e1', display: 'block' }}> to {leave.toDateStr}</span>}
            </div>

            <div>
              <span style={{ color: '#94a3b8', fontSize: '0.75rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CATEGORY / TYPE</span>
              <strong style={{ color: '#a5b4fc', fontSize: '0.95rem' }}>📌 {leave.leaveType.replace('_', ' ')}</strong>
              {leave.isHalfDay && (
                <span style={{ color: '#fbbf24', fontSize: '0.8rem', display: 'block', fontWeight: 600 }}>
                  Half Day {leave.halfDayTime ? `(${leave.halfDayTime})` : ''}
                </span>
              )}
            </div>
          </div>

          {/* Leave Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.9rem', color: '#cbd5e1', fontWeight: 600 }}>Current Approval Status:</span>
            <span style={{
              fontWeight: 700,
              fontSize: '0.85rem',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px',
              background: leave.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.2)' : leave.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)',
              color: leave.status === 'APPROVED' ? '#4ade80' : leave.status === 'REJECTED' ? '#f87171' : '#fde047',
              border: `1px solid ${leave.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.4)' : leave.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`
            }}>
              {leave.status === 'PENDING' ? '⏳ PENDING HR APPROVAL' : leave.status}
            </span>
          </div>

          {/* Full Letter Body Card */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#c7d2fe', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Full Written Leave Letter & Reason
            </label>
            <div style={{
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: '#f8fafc',
              fontSize: '1rem',
              lineHeight: '1.75',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              minHeight: '220px',
              maxHeight: '50vh',
              overflowY: 'auto'
            }}>
              {fullReason}
            </div>
          </div>
        </div>

        {/* Footer Quick Action Bar */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            style={{
              padding: '0.6rem 1.2rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          {leave.status === 'PENDING' && (
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => handleStatusChange('REJECTED')}
                disabled={loading}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                }}
              >
                <X size={16} /> {loading ? 'Saving...' : 'Reject Leave'}
              </button>

              <button
                type="button"
                onClick={() => handleStatusChange('APPROVED')}
                disabled={loading}
                style={{
                  padding: '0.6rem 1.25rem',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.3)'
                }}
              >
                <Check size={16} /> {loading ? 'Saving...' : 'Approve Leave'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', maxWidth: '240px' }}>
        <div style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '0.85rem',
          color: 'var(--text-secondary, #94a3b8)'
        }}>
          {leave.reason ? snippet : '—'}
        </div>

        {leave.reason && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#818cf8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              textAlign: 'left'
            }}
          >
            <FileText size={12} /> View Full Letter {isLong ? '➔' : ''}
          </button>
        )}
      </div>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
