'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error);
  }, [error]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '500px',
          width: '100%',
          background: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '1rem',
          padding: '2rem',
          textAlign: 'center',
          color: '#f8fafc',
        }}
      >
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>
          Page Failed to Load
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          {error?.message && !error.message.includes('Minified React error')
            ? error.message
            : 'An unexpected server error occurred while loading this section.'}
        </p>

        {error?.digest && (
          <div
            style={{
              background: 'rgba(30, 41, 59, 0.9)',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.78rem',
              color: '#cbd5e1',
              fontFamily: 'monospace',
              marginBottom: '1.25rem',
              border: '1px solid rgba(148, 163, 184, 0.2)',
            }}
          >
            Error Digest: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button onClick={() => reset()} className="btn btn-primary">
            <RefreshCw size={15} />
            Try Again
          </button>
          <Link href="/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <Home size={15} />
            Dashboard Home
          </Link>
        </div>
      </div>
    </div>
  );
}
