'use client';

import { useState } from 'react';
import { explainSalaryAction } from '@/actions/ai';
import { Sparkles, Bot, Loader2, ChevronDown, ChevronUp, Copy, Check, RefreshCw } from 'lucide-react';

export default function AISalaryExplainer({
  payrollId,
  employeeName,
}: {
  payrollId: string;
  employeeName: string;
}) {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const res = await explainSalaryAction(payrollId);
    if (res.success && res.explanation) {
      setExplanation(res.explanation);
      setExpanded(true);
    } else {
      setError(res.message || 'Failed to generate explanation.');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    if (!explanation) return;
    navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="glass-card-static"
      style={{
        marginTop: '1.5rem',
        border: '1px solid rgba(99, 102, 241, 0.25)',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(168, 85, 247, 0.04) 100%)',
        borderRadius: '16px',
        padding: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '10px',
              backgroundColor: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              AI Salary Breakdown & Explainer
            </h3>
            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Get an instant plain-English audit and breakdown of {employeeName}&apos;s calculated net salary.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {explanation && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="btn btn-ghost btn-sm btn-icon"
              >
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="btn btn-primary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              border: 'none',
              fontWeight: 600,
              padding: '0.5rem 1rem',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                {explanation ? <RefreshCw size={14} /> : <Sparkles size={14} />}
                {explanation ? 'Re-explain' : '🤖 Explain with AI'}
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#f87171',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {explanation && expanded && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--text-primary)',
            fontSize: '0.9rem',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
          }}
        >
          {explanation}
        </div>
      )}
    </div>
  );
}
