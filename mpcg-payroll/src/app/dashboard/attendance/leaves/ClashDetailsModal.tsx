'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X, Calendar } from 'lucide-react';
import type { LeaveItem } from './LeavesClient';

export interface ClashingEmployee {
  id: string;
  employeeName: string;
  employeeId: string;
  department?: string | null;
  status: string;
  fromDateStr: string;
  toDateStr: string;
  isSameDepartment?: boolean;
}

interface ClashDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  leave: LeaveItem | null;
  clashes: ClashingEmployee[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

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

export default function ClashDetailsModal({
  isOpen,
  onClose,
  leave,
  clashes,
}: ClashDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background body scrolling when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !leave) return null;

  const hasSameDept = clashes.some((c) => c.isSameDepartment);
  const totalEmployeesOnLeave = clashes.length + 1;

  const modalMarkup = (
    <div className="clash-modal-overlay" onClick={onClose}>
      <div className="clash-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="clash-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="clash-modal-title">Same-Day Leave Clash</h3>
                <span className="clash-count-pill">
                  {totalEmployeesOnLeave} Employees
                </span>
              </div>
              <p className="clash-modal-subtitle">
                Multiple staff members are scheduled on leave during overlapping dates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="clash-close-btn"
            title="Close popup"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="clash-body-scroll">
          {/* Same department warning banner */}
          {hasSameDept && (
            <div className="clash-dept-alert">
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>⚠️</span>
              <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                <strong>Same Department Conflict:</strong> At least two staff members from{' '}
                <strong>{leave.employee.department || 'the same department'}</strong> are
                requesting leave on the same date(s). Please review department coverage!
              </div>
            </div>
          )}

          {/* Current Employee Application */}
          <div>
            <div className="clash-section-label">Current Application</div>
            <div className="clash-emp-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: getAvatarBg(leave.employee.name),
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(leave.employee.name)}
                </div>
                <div>
                  <div className="clash-emp-name">{leave.employee.name}</div>
                  <div className="clash-emp-meta">
                    <span>{leave.employee.employeeId}</span>
                    <span>•</span>
                    <span>{leave.employee.department || 'Staff'}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div className="clash-emp-date">
                  <Calendar size={13} style={{ flexShrink: 0 }} />
                  <span>
                    {leave.fromDateStr === leave.toDateStr
                      ? leave.fromDateStr
                      : `${leave.fromDateStr} – ${leave.toDateStr}`}
                  </span>
                </div>
                <div style={{ marginTop: '3px' }}>
                  <span
                    className={
                      leave.status === 'APPROVED'
                        ? 'clash-status-pill clash-status-approved'
                        : 'clash-status-pill clash-status-pending'
                    }
                  >
                    {leave.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Overlapping Employees */}
          <div>
            <div className="clash-section-label-red">
              <span>Overlapping Staff on Leave ({clashes.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {clashes.map((clash) => (
                <div
                  key={clash.id}
                  className={clash.isSameDepartment ? 'clash-emp-card-same-dept' : 'clash-emp-card'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: getAvatarBg(clash.employeeName),
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(clash.employeeName)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="clash-emp-name">{clash.employeeName}</span>
                        {clash.isSameDepartment && (
                          <span className="clash-same-dept-pill">SAME DEPT</span>
                        )}
                      </div>
                      <div className="clash-emp-meta">
                        <span>{clash.employeeId}</span>
                        <span>•</span>
                        <span>{clash.department || 'Staff'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className="clash-emp-date-clash">
                      <Calendar size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>
                        {clash.fromDateStr === clash.toDateStr
                          ? clash.fromDateStr
                          : `${clash.fromDateStr} – ${clash.toDateStr}`}
                      </span>
                    </div>
                    <div style={{ marginTop: '3px' }}>
                      <span
                        className={
                          clash.status === 'APPROVED'
                            ? 'clash-status-pill clash-status-approved'
                            : 'clash-status-pill clash-status-pending'
                        }
                      >
                        {clash.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="clash-modal-footer">
          <button type="button" onClick={onClose} className="clash-footer-close-btn">
            Close
          </button>
        </div>
      </div>

      <style jsx>{`
        .clash-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.65);
          padding: 1rem;
          animation: clashFadeIn 0.15s ease-out;
        }
        :global([data-theme="light"]) .clash-modal-overlay {
          background-color: rgba(15, 23, 42, 0.45) !important;
        }

        .clash-modal-dialog {
          width: 100%;
          max-width: 540px;
          max-height: 85vh;
          background-color: #0f172a;
          border: 1.5px solid rgba(239, 68, 68, 0.45);
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.25);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: clashScaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        :global([data-theme="light"]) .clash-modal-dialog {
          background-color: #ffffff !important;
          border: 1.5px solid rgba(239, 68, 68, 0.3) !important;
          box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.15), 0 0 25px rgba(239, 68, 68, 0.08) !important;
        }

        .clash-modal-header {
          padding: 1.1rem 1.25rem;
          background: linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.03) 100%);
          border-bottom: 1px solid rgba(239, 68, 68, 0.2);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        :global([data-theme="light"]) .clash-modal-header {
          background: linear-gradient(180deg, #fff1f2 0%, #ffffff 100%) !important;
          border-bottom: 1px solid #fee2e2 !important;
        }

        .clash-modal-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
        }
        :global([data-theme="light"]) .clash-modal-title {
          color: #0f172a !important;
        }

        .clash-modal-subtitle {
          margin: 2px 0 0 0;
          font-size: 0.78rem;
          color: #94a3b8;
        }
        :global([data-theme="light"]) .clash-modal-subtitle {
          color: #64748b !important;
        }

        .clash-count-pill {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        :global([data-theme="light"]) .clash-count-pill {
          background: #fee2e2 !important;
          color: #b91c1c !important;
          border: 1px solid #fca5a5 !important;
        }

        .clash-close-btn {
          background: rgba(255, 255, 255, 0.06);
          border: none;
          color: #94a3b8;
          cursor: pointer;
          padding: 6px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .clash-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
        }
        :global([data-theme="light"]) .clash-close-btn {
          background: #f1f5f9 !important;
          color: #475569 !important;
        }
        :global([data-theme="light"]) .clash-close-btn:hover {
          background: #e2e8f0 !important;
          color: #0f172a !important;
        }

        .clash-body-scroll {
          padding: 1.15rem 1.25rem;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.95rem;
        }
        .clash-body-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .clash-body-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .clash-body-scroll::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.25);
          border-radius: 4px;
        }
        .clash-body-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.45);
        }

        .clash-dept-alert {
          padding: 0.75rem 1rem;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.35);
          display: flex;
          align-items: center;
          gap: 0.65rem;
          color: #fde68a;
        }
        :global([data-theme="light"]) .clash-dept-alert {
          background: #fffbeb !important;
          border: 1px solid #fde68a !important;
          color: #92400e !important;
        }
        :global([data-theme="light"]) .clash-dept-alert strong {
          color: #78350f !important;
        }

        .clash-section-label {
          font-size: 0.72rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.45rem;
        }
        :global([data-theme="light"]) .clash-section-label {
          color: #475569 !important;
          font-weight: 800 !important;
        }

        .clash-section-label-red {
          font-size: 0.72rem;
          font-weight: 700;
          color: #f87171;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.45rem;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        :global([data-theme="light"]) .clash-section-label-red {
          color: #b91c1c !important;
          font-weight: 800 !important;
        }

        .clash-emp-card {
          padding: 0.8rem 1rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        :global([data-theme="light"]) .clash-emp-card {
          background: #f8fafc !important;
          border: 1px solid #e2e8f0 !important;
        }

        .clash-emp-card-same-dept {
          padding: 0.8rem 1rem;
          border-radius: 12px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.3);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
        }
        :global([data-theme="light"]) .clash-emp-card-same-dept {
          background: #fef2f2 !important;
          border: 1.5px solid #fca5a5 !important;
        }

        .clash-emp-name {
          font-weight: 700;
          color: #ffffff;
          font-size: 0.9rem;
        }
        :global([data-theme="light"]) .clash-emp-name {
          color: #0f172a !important;
        }

        .clash-emp-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.74rem;
          color: #94a3b8;
          margin-top: 2px;
        }
        :global([data-theme="light"]) .clash-emp-meta {
          color: #64748b !important;
        }

        .clash-emp-date {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #22d3ee;
          font-size: 0.78rem;
          font-weight: 600;
        }
        :global([data-theme="light"]) .clash-emp-date {
          color: #0284c7 !important;
          font-weight: 700 !important;
        }

        .clash-emp-date-clash {
          display: flex;
          align-items: center;
          gap: 5px;
          color: #e2e8f0;
          font-size: 0.76rem;
          font-weight: 600;
        }
        :global([data-theme="light"]) .clash-emp-date-clash {
          color: #475569 !important;
          font-weight: 700 !important;
        }

        .clash-same-dept-pill {
          font-size: 0.62rem;
          font-weight: 800;
          padding: 1px 5px;
          border-radius: 4px;
          background: rgba(239, 68, 68, 0.25);
          color: #fca5a5;
          border: 1px solid rgba(239, 68, 68, 0.4);
        }
        :global([data-theme="light"]) .clash-same-dept-pill {
          background: #fee2e2 !important;
          color: #b91c1c !important;
          border: 1px solid #f87171 !important;
        }

        .clash-status-pill {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 6px;
        }
        .clash-status-approved {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        :global([data-theme="light"]) .clash-status-approved {
          background: #dcfce7 !important;
          color: #15803d !important;
          border: 1px solid #86efac !important;
          font-weight: 800 !important;
        }
        .clash-status-pending {
          background: rgba(245, 158, 11, 0.15);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.3);
        }
        :global([data-theme="light"]) .clash-status-pending {
          background: #fef3c7 !important;
          color: #b45309 !important;
          border: 1px solid #fcd34d !important;
          font-weight: 800 !important;
        }

        .clash-modal-footer {
          padding: 0.85rem 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(0, 0, 0, 0.2);
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
        }
        :global([data-theme="light"]) .clash-modal-footer {
          background: #f8fafc !important;
          border-top: 1px solid #e2e8f0 !important;
        }

        .clash-footer-close-btn {
          padding: 0.45rem 1.2rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .clash-footer-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        :global([data-theme="light"]) .clash-footer-close-btn {
          background: #ffffff !important;
          border: 1px solid #cbd5e1 !important;
          color: #334155 !important;
          font-weight: 700 !important;
        }
        :global([data-theme="light"]) .clash-footer-close-btn:hover {
          background: #f1f5f9 !important;
          color: #0f172a !important;
        }

        @keyframes clashFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes clashScaleIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );

  return mounted ? createPortal(modalMarkup, document.body) : null;
}
