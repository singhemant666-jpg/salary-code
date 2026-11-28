'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: '#0f172a',
        color: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: '#1e293b',
          borderRadius: '1rem',
          padding: '2rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          textAlign: 'center',
        }}
      >
        <AlertTriangle size={32} color="#f87171" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          Unexpected Application Error
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 1.25rem' }}>
          Please try refreshing the page. If the issue persists, share the reference code below with support.
        </p>

        {error?.digest && (
          <div
            style={{
              background: '#0f172a',
              borderRadius: '0.5rem',
              padding: '0.5rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              fontFamily: 'monospace',
              marginBottom: '1.25rem',
            }}
          >
            Ref: {error.digest}
          </div>
        )}

        <button
          onClick={() => reset()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.65rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: '#0284c7',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={15} />
          Try Again
        </button>
      </div>
    </div>
  );
}
