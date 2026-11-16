'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { syncEmployeesFromRealtimeCloud } from '@/actions/realtime-cloud-sync';
import { RefreshCw, CheckCircle2, AlertCircle, X, UserCheck } from 'lucide-react';

interface SyncResult {
  success: boolean;
  message: string;
  data?: {
    newCount: number;
    updatedCount: number;
    totalCloud: number;
    newEmployees?: Array<{ id: string; name: string; employeeId: string }>;
  };
}

export default function SyncCloudEmployeesButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState<SyncResult | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSync = async () => {
    setLoading(true);
    try {
      const res = await syncEmployeesFromRealtimeCloud();
      setPopup(res as SyncResult);
      if (res.success) {
        router.refresh();
      }
    } catch (err: any) {
      setPopup({
        success: false,
        message: err.message || 'Failed to connect to Realtime Cloud',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPopup(null);
    router.refresh();
  };

  const modalContent = popup ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(3, 7, 18, 0.78)',
        /* Completely removed backdrop-filter / blur so the background is clean and crisp */
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          margin: 'auto',
          width: '100%',
          maxWidth: '440px',
          maxHeight: 'calc(100vh - 2rem)',
          overflowY: 'auto',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(2, 132, 199, 0.12)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          type="button"
          style={{
            position: 'absolute',
            top: '0.875rem',
            right: '0.875rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s ease',
          }}
          title="Close"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#f8fafc';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94a3b8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <X size={16} />
        </button>

        {/* Status Icon */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: popup.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: popup.success ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.875rem',
          }}
        >
          {popup.success ? (
            <CheckCircle2 size={28} color="#10b981" />
          ) : (
            <AlertCircle size={28} color="#ef4444" />
          )}
        </div>

        {/* Modal Header */}
        <h3
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            margin: '0 0 0.5rem 0',
            color: '#ffffff',
            letterSpacing: '-0.01em',
          }}
        >
          {popup.success ? 'Realtime Cloud Sync Complete' : 'Sync Unsuccessful'}
        </h3>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#94a3b8',
            margin: '0 0 1.25rem 0',
            lineHeight: 1.5,
            maxWidth: '380px',
          }}
        >
          {popup.message}
        </p>

        {/* Summary Grid */}
        {popup.success && popup.data && (
          <div
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '0.875rem',
              marginBottom: '1.25rem',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.5rem',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  padding: '0.625rem 0.25rem',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(56, 189, 248, 0.15)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#38bdf8', lineHeight: 1.1 }}>
                  {popup.data.newCount}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                  New Added
                </div>
              </div>

              <div
                style={{
                  padding: '0.625rem 0.25rem',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(167, 139, 250, 0.15)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#a78bfa', lineHeight: 1.1 }}>
                  {popup.data.updatedCount}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                  Updated
                </div>
              </div>

              <div
                style={{
                  padding: '0.625rem 0.25rem',
                  background: 'rgba(30, 41, 59, 0.5)',
                  border: '1px solid rgba(52, 211, 153, 0.15)',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#34d399', lineHeight: 1.1 }}>
                  {popup.data.totalCloud}
                </div>
                <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '4px', fontWeight: 500 }}>
                  Total Cloud
                </div>
              </div>
            </div>

            {popup.data.newEmployees && popup.data.newEmployees.length > 0 && (
              <div
                style={{
                  marginTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: '0.625rem',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#38bdf8',
                    marginBottom: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <UserCheck size={14} />
                  Newly Registered Employees:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {popup.data.newEmployees.map((emp) => (
                    <span
                      key={emp.id}
                      style={{
                        background: 'rgba(2, 132, 199, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#e0f2fe',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                      }}
                    >
                      {emp.name} ({emp.employeeId})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Done Button */}
        <button
          onClick={handleClose}
          type="button"
          className="btn btn-primary"
          style={{
            width: '100%',
            height: '42px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 600,
            fontSize: '0.9375rem',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={handleSync}
        disabled={loading}
        className="btn"
        type="button"
        style={{
          background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
          color: '#ffffff',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.625rem 1.15rem',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.875rem',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.75 : 1,
          transition: 'all 0.2s ease',
        }}
        title="Sync all employees directly from Realtime Cloud biometric software"
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        <span>{loading ? 'Syncing Cloud...' : 'Sync Realtime Cloud'}</span>
      </button>

      {mounted && typeof document !== 'undefined' && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
