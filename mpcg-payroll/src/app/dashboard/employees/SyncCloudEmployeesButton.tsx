'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { syncEmployeesFromRealtimeCloud } from '@/actions/realtime-cloud-sync';
import { RefreshCw, CheckCircle2, AlertCircle, X, UserCheck, ShieldCheck } from 'lucide-react';

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

  return (
    <>
      <button
        onClick={handleSync}
        disabled={loading}
        className="btn"
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

      {popup && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 24, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={handleClose}
        >
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 24px rgba(2, 132, 199, 0.15)',
              color: '#f8fafc',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleClose}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                borderRadius: '8px',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close"
            >
              <X size={18} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: popup.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: popup.success ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                {popup.success ? (
                  <CheckCircle2 size={32} color="#10b981" />
                ) : (
                  <AlertCircle size={32} color="#ef4444" />
                )}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
                {popup.success ? 'Realtime Cloud Sync Complete' : 'Sync Unsuccessful'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                {popup.message}
              </p>
            </div>

            {popup.success && popup.data && (
              <div
                style={{
                  background: 'rgba(30, 41, 59, 0.6)',
                  border: '1px solid rgba(51, 65, 85, 0.6)',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
                  <div style={{ padding: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8' }}>
                      {popup.data.newCount}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>New Added</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#a78bfa' }}>
                      {popup.data.updatedCount}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Updated</div>
                  </div>
                  <div style={{ padding: '0.5rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#34d399' }}>
                      {popup.data.totalCloud}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>Total Cloud</div>
                  </div>
                </div>

                {popup.data.newEmployees && popup.data.newEmployees.length > 0 && (
                  <div style={{ marginTop: '0.875rem', borderTop: '1px solid rgba(51, 65, 85, 0.6)', paddingTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#38bdf8', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                            padding: '3px 8px',
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

            <button
              onClick={handleClose}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '0.75rem',
                justifyContent: 'center',
                fontWeight: 600,
                borderRadius: '8px',
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
