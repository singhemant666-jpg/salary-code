'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updateLeaveStatus } from '@/actions/leaves';
import { Check, X, Calendar, AlertCircle } from 'lucide-react';

interface ApproveLeaveModalProps {
  leave: {
    id: string;
    employeeName: string;
    employeeId: string;
    fromDateStr: string;
    toDateStr: string;
    fromDateRaw: string; // YYYY-MM-DD
    toDateRaw: string;   // YYYY-MM-DD
    leaveType: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveLeaveModal({
  leave,
  isOpen,
  onClose,
  onSuccess,
}: ApproveLeaveModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'FULL' | 'CUSTOM'>('FULL');
  
  const [approvedFromDate, setApprovedFromDate] = useState(leave.fromDateRaw);
  const [approvedToDate, setApprovedToDate] = useState(leave.toDateRaw);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setApprovalMode('FULL');
      setApprovedFromDate(leave.fromDateRaw);
      setApprovedToDate(leave.toDateRaw);
    }
  }, [isOpen, leave.fromDateRaw, leave.toDateRaw]);

  // Calculate total applied days
  const startApplied = new Date(leave.fromDateRaw);
  const endApplied = new Date(leave.toDateRaw);
  const totalAppliedDays = Math.max(1, Math.round((endApplied.getTime() - startApplied.getTime()) / (1000 * 3600 * 24)) + 1);

  // Calculate total approved days
  const startApproved = new Date(approvedFromDate);
  const endApproved = new Date(approvedToDate);
  const totalApprovedDays = Math.max(1, Math.round((endApproved.getTime() - startApproved.getTime()) / (1000 * 3600 * 24)) + 1);
  const remainingDays = Math.max(0, totalAppliedDays - totalApprovedDays);

  const handleConfirm = async () => {
    setLoading(true);
    let fromVal: string | undefined;
    let toVal: string | undefined;

    if (approvalMode === 'CUSTOM') {
      fromVal = approvedFromDate;
      toVal = approvedToDate;
    }

    const res = await updateLeaveStatus(leave.id, 'APPROVED', fromVal, toVal);
    setLoading(false);

    if (res.success) {
      onClose();
      onSuccess();
    } else {
      alert(res.message);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              padding: '0.4rem',
              borderRadius: '8px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex'
            }}>
              <Check size={20} />
            </span>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Approve Leave Application
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {leave.employeeName} ({leave.employeeId})
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem',
              color: '#94a3b8',
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Summary Box */}
          <div style={{
            background: 'rgba(15, 23, 42, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>APPLIED PERIOD</span>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#ffffff', marginTop: '2px' }}>
                📅 {leave.fromDateStr} {leave.fromDateStr !== leave.toDateStr ? `to ${leave.toDateStr}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>APPLIED DAYS</span>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fbbf24' }}>
                {totalAppliedDays} {totalAppliedDays === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c7d2fe', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Approval Options
            </label>

            {/* Option 1: Full Range */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: approvalMode === 'FULL' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${approvalMode === 'FULL' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name="approvalMode"
                value="FULL"
                checked={approvalMode === 'FULL'}
                onChange={() => setApprovalMode('FULL')}
                style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#ffffff' }}>
                  Approve Full Applied Period ({totalAppliedDays} Days)
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Approve all dates from {leave.fromDateStr} to {leave.toDateStr}
                </span>
              </div>
            </label>

            {/* Option 2: Custom / Partial Days */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: approvalMode === 'CUSTOM' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${approvalMode === 'CUSTOM' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name="approvalMode"
                value="CUSTOM"
                checked={approvalMode === 'CUSTOM'}
                onChange={() => setApprovalMode('CUSTOM')}
                style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#ffffff' }}>
                  Approve Custom Days / Partial Range
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Approve fewer days (e.g. 2 or 3 days out of {totalAppliedDays} days)
                </span>
              </div>
            </label>
          </div>

          {/* Custom Date Controls */}
          {approvalMode === 'CUSTOM' && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              padding: '1.15rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              animation: 'fade-in 0.2s ease'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    APPROVED FROM DATE
                  </label>
                  <input
                    type="date"
                    value={approvedFromDate}
                    min={leave.fromDateRaw}
                    max={approvedToDate || leave.toDateRaw}
                    onChange={(e) => setApprovedFromDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.3rem' }}>
                    APPROVED TO DATE
                  </label>
                  <input
                    type="date"
                    value={approvedToDate}
                    min={approvedFromDate || leave.fromDateRaw}
                    max={leave.toDateRaw}
                    onChange={(e) => setApprovedToDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '8px',
                      background: '#0f172a',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#ffffff',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Days Count Result Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.9rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: '8px',
                fontSize: '0.85rem'
              }}>
                <span style={{ color: '#4ade80', fontWeight: 600 }}>
                  Approved Duration:
                </span>
                <span style={{ color: '#ffffff', fontWeight: 800 }}>
                  {totalApprovedDays} {totalApprovedDays === 1 ? 'Day' : 'Days'} Approved
                </span>
              </div>

              {remainingDays > 0 && (
                <div style={{ fontSize: '0.78rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={14} />
                  <span>
                    Remaining {remainingDays} {remainingDays === 1 ? 'day' : 'days'} will stay unapproved / calculated as Loss of Pay (LOP).
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(15, 23, 42, 0.7)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.65rem 1.25rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#cbd5e1',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || (approvalMode === 'CUSTOM' && totalApprovedDays <= 0)}
            style={{
              padding: '0.65rem 1.35rem',
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
            <Check size={16} />
            {loading ? 'Approving...' : `Confirm Approve (${approvalMode === 'FULL' ? totalAppliedDays : totalApprovedDays} Days)`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
