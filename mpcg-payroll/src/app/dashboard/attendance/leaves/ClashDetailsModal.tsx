'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, X, Calendar, User, Briefcase, CheckCircle2, Clock } from 'lucide-react';
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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !leave) return null;

  const hasSameDept = clashes.some((c) => c.isSameDepartment);
  const totalEmployeesOnLeave = clashes.length + 1;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          backgroundColor: '#0f172a',
          border: '1.5px solid rgba(239, 68, 68, 0.45)',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.03) 100%)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ef4444',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.35)',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#ffffff' }}>
                  Same-Day Leave Clash
                </h3>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    background: 'rgba(239, 68, 68, 0.25)',
                    color: '#fca5a5',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                  }}
                >
                  {totalEmployeesOnLeave} Employees
                </span>
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Multiple staff members are scheduled on leave during overlapping dates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div style={{ padding: '1.4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Same department warning banner */}
          {hasSameDept && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>⚠️</span>
              <div style={{ fontSize: '0.8rem', color: '#fde68a', lineHeight: 1.4 }}>
                <strong>Same Department Conflict:</strong> At least two staff members from{' '}
                <strong style={{ color: '#ffffff' }}>{leave.employee.department || 'the same department'}</strong> are
                requesting leave on the same date(s). Please review department coverage!
              </div>
            </div>
          )}

          {/* This Employee's Application */}
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.45rem',
              }}
            >
              Current Application
            </div>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
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
                  <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.9rem' }}>
                    {leave.employee.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                    <span>{leave.employee.employeeId}</span>
                    <span>•</span>
                    <span>{leave.employee.department || 'Staff'}</span>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#22d3ee', fontSize: '0.78rem', fontWeight: 600 }}>
                  <Calendar size={13} />
                  <span>
                    {leave.fromDateStr === leave.toDateStr
                      ? leave.fromDateStr
                      : `${leave.fromDateStr} – ${leave.toDateStr}`}
                  </span>
                </div>
                <div style={{ marginTop: '3px' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: leave.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: leave.status === 'APPROVED' ? '#34d399' : '#fbbf24',
                      border: `1px solid ${leave.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    }}
                  >
                    {leave.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Conflicting Employees */}
          <div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#f87171',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.45rem',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>Overlapping Staff on Leave ({clashes.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {clashes.map((clash) => (
                <div
                  key={clash.id}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    background: clash.isSameDepartment ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${clash.isSameDepartment ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.07)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
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
                        <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>
                          {clash.employeeName}
                        </span>
                        {clash.isSameDepartment && (
                          <span
                            style={{
                              fontSize: '0.62rem',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(239, 68, 68, 0.25)',
                              color: '#fca5a5',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                            }}
                          >
                            SAME DEPT
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                        <span>{clash.employeeId}</span>
                        <span>•</span>
                        <span>{clash.department || 'Staff'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#e2e8f0', fontSize: '0.76rem', fontWeight: 600 }}>
                      <Calendar size={12} color="#f87171" />
                      <span>
                        {clash.fromDateStr === clash.toDateStr
                          ? clash.fromDateStr
                          : `${clash.fromDateStr} – ${clash.toDateStr}`}
                      </span>
                    </div>
                    <div style={{ marginTop: '3px' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          background: clash.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: clash.status === 'APPROVED' ? '#34d399' : '#fbbf24',
                          border: `1px solid ${clash.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                        }}
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
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.5rem 1.25rem',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
