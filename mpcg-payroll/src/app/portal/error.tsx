'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, LogIn } from 'lucide-react';
import Link from 'next/link';
import { reportClientError } from '@/actions/error-logs';

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Employee Portal Error]', error);
    reportClientError({
      source: 'portal/error.tsx',
      message: error?.message || 'Portal UI Error',
      digest: error?.digest,
      stack: error?.stack,
      path: typeof window !== 'undefined' ? window.location.pathname : '/portal',
    }).catch(() => {});
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          background: '#ffffff',
          borderRadius: '1rem',
          padding: '2rem 1.5rem',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
          border: '1px solid #e2e8f0',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
          }}
        >
          <AlertTriangle size={26} />
        </div>

        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.5rem' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: '0.9rem', color: '#475569', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          We ran into a temporary issue loading your Employee Portal. Please try again.
        </p>

        {error?.digest && (
          <div
            style={{
              background: '#f1f5f9',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.75rem',
              fontSize: '0.75rem',
              color: '#64748b',
              fontFamily: 'monospace',
              marginBottom: '1.25rem',
            }}
          >
            Error Ref: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem 1.1rem',
              borderRadius: '0.6rem',
              border: 'none',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} />
            Try Again
          </button>

          <Link
            href="/portal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.65rem 1.1rem',
              borderRadius: '0.6rem',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.88rem',
              textDecoration: 'none',
            }}
          >
            <LogIn size={15} />
            Reload Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
