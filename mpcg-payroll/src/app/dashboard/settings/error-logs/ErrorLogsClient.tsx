'use client';

import { useState } from 'react';
import { fetchSystemErrorLogs, clearSystemErrorLogs } from '@/actions/error-logs';
import type { SystemErrorEntry } from '@/lib/error-logger';
import { RefreshCw, Trash2, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';

export default function ErrorLogsClient({ initialLogs }: { initialLogs: SystemErrorEntry[] }) {
  const [logs, setLogs] = useState<SystemErrorEntry[]>(initialLogs);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetchSystemErrorLogs();
      if (res.success) {
        setLogs(res.logs);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all recorded system error logs?')) return;
    setLoading(true);
    try {
      const res = await clearSystemErrorLogs();
      if (res.success) {
        setLogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatIST = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Error Logs</h1>
          <p className="page-subtitle">
            Human-readable server, database, and portal errors for quick debugging
          </p>
        </div>
        <div className="flex-gap">
          <button onClick={handleRefresh} disabled={loading} className="btn btn-secondary">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {logs.length > 0 && (
            <button
              onClick={handleClear}
              disabled={loading}
              className="btn"
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <Trash2 size={15} />
              Clear Logs
            </button>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '3rem',
            textAlign: 'center',
            marginTop: '1rem',
          }}
        >
          <CheckCircle2 size={36} color="#34d399" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.05rem', fontWeight: 600 }}>
            No Errors Recorded
          </h3>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.88rem' }}>
            All server actions, database queries, and portal requests are running cleanly.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {logs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="card"
                style={{
                  padding: '1rem 1.25rem',
                  borderLeft: '4px solid #ef4444',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    cursor: 'pointer',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        flexWrap: 'wrap',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <AlertTriangle size={15} color="#f87171" />
                      <span
                        className="font-mono"
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.12)',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '0.35rem',
                        }}
                      >
                        {entry.source}
                      </span>
                      {entry.digest && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: '0.75rem',
                            color: '#fbbf24',
                            background: 'rgba(251, 191, 36, 0.12)',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '0.35rem',
                          }}
                        >
                          Digest: {entry.digest}
                        </span>
                      )}
                      <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                        {formatIST(entry.timestamp)}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 500,
                        color: '#fecaca',
                        wordBreak: 'break-word',
                      }}
                    >
                      {entry.message}
                    </div>
                  </div>

                  <div style={{ color: '#94a3b8', paddingTop: '0.2rem' }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: '0.85rem',
                      paddingTop: '0.85rem',
                      borderTop: '1px solid rgba(148, 163, 184, 0.15)',
                      fontSize: '0.8rem',
                    }}
                  >
                    {entry.context && Object.keys(entry.context).length > 0 && (
                      <div style={{ marginBottom: '0.6rem' }}>
                        <strong style={{ color: '#cbd5e1' }}>Context:</strong>{' '}
                        <code style={{ color: '#93c5fd' }}>
                          {JSON.stringify(entry.context)}
                        </code>
                      </div>
                    )}
                    {entry.stack && (
                      <pre
                        style={{
                          margin: 0,
                          padding: '0.75rem',
                          background: 'rgba(15, 23, 42, 0.85)',
                          borderRadius: '0.5rem',
                          color: '#cbd5e1',
                          overflowX: 'auto',
                          fontSize: '0.75rem',
                          lineHeight: 1.45,
                        }}
                      >
                        {entry.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
