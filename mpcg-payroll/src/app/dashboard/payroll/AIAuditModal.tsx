'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { runPayrollAuditAction } from '@/actions/ai';
import { getMonthName } from '@/lib/currency-utils';
import { Bot, Sparkles, X, Loader2, RefreshCw, Copy, Check, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function AIAuditModal({
  month,
  year,
  totalEmployees,
}: {
  month: number;
  year: number;
  totalEmployees: number;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRunAudit = async () => {
    setLoading(true);
    setError(null);
    const res = await runPayrollAuditAction(month, year);
    if (res.success && res.report) {
      setReport(res.report);
    } else {
      setError(res.message || 'Failed to generate audit report.');
    }
    setLoading(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (!report) {
      handleRunAudit();
    }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          backgroundColor: '#0F172A',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.1) 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '10px',
                backgroundColor: 'rgba(99, 102, 241, 0.25)',
                color: '#818cf8',
              }}
            >
              <Bot size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#ffffff' }}>
                AI Payroll Health & Anomaly Audit
              </h2>
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#94A3B8' }}>
                {getMonthName(month)} {year} · {totalEmployees} Active Employees Audited
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {report && (
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#CBD5E1' }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
            <button
              type="button"
              onClick={handleRunAudit}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#CBD5E1' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Re-Audit
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, color: '#E2E8F0' }}>
          {loading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4rem 1rem',
                gap: '1rem',
              }}
            >
              <Loader2 size={36} className="animate-spin" color="#818cf8" />
              <div style={{ fontWeight: 600, fontSize: '1.05rem', color: '#F1F5F9' }}>
                Running Deep AI Anomaly Audit...
              </div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94A3B8', textAlign: 'center', maxWidth: '400px' }}>
                Scanning all {totalEmployees} employee attendance punches, under-time shortfall, overtime eligibility, sandwich rules, and salary hold deductions.
              </p>
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                padding: '1rem 1.25rem',
                borderRadius: '10px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <AlertTriangle size={20} />
              <span>{error}</span>
            </div>
          )}

          {report && !loading && (
            <div
              style={{
                fontSize: '0.925rem',
                lineHeight: '1.65',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}
            >
              {report}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            backgroundColor: '#090D16',
          }}
        >
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn btn-secondary"
            style={{ padding: '0.5rem 1.25rem' }}
          >
            Close Audit Report
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="btn btn-secondary btn-sm"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          border: '1px solid rgba(99, 102, 241, 0.4)',
          background: 'rgba(99, 102, 241, 0.08)',
          color: '#818cf8',
          fontWeight: 600,
          padding: '0.45rem 0.85rem',
        }}
      >
        <Sparkles size={15} />
        🤖 AI Audit Payroll
      </button>

      {typeof document !== 'undefined' && createPortal(modalContent, document.body)}
    </>
  );
}
