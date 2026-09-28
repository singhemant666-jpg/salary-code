'use client';

import { useState } from 'react';
import { releaseEmployeeHeldSalary } from '@/actions/payroll';
import { formatINR } from '@/lib/currency-utils';
import { ShieldCheck, Unlock, AlertCircle, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReleaseSalaryHoldModalProps {
  employeeId: string;
  employeeName: string;
  heldSalaryBalance: number;
  holdSalaryStatus: string;
  holdSalaryReleasedAt?: Date | string | null;
  holdSalaryReleaseNotes?: string | null;
  holdSalaryOnJoining?: boolean;
}

export default function ReleaseSalaryHoldModal({
  employeeId,
  employeeName,
  heldSalaryBalance,
  holdSalaryStatus,
  holdSalaryReleasedAt,
  holdSalaryReleaseNotes,
  holdSalaryOnJoining,
}: ReleaseSalaryHoldModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState<string>(String(heldSalaryBalance || 0));
  const [notes, setNotes] = useState<string>('Full & Final Settlement - Held Salary Refund');
  const [error, setError] = useState<string | null>(null);

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    const releaseAmt = parseFloat(amount) || 0;
    if (releaseAmt <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await releaseEmployeeHeldSalary(employeeId, {
        customAmount: releaseAmt,
        notes,
      });

      if (res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to release held salary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="glass-card-static" style={{ marginTop: '1.5rem', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: holdSalaryStatus === 'RELEASED' ? 'rgba(34, 197, 94, 0.15)' : heldSalaryBalance > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: holdSalaryStatus === 'RELEASED' ? '#16a34a' : heldSalaryBalance > 0 ? '#f59e0b' : '#64748b',
              }}
            >
              {holdSalaryStatus === 'RELEASED' ? <ShieldCheck size={22} /> : <Unlock size={22} />}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Joining Salary Hold (15 Days)</h3>
                <span
                  className={`badge ${
                    holdSalaryStatus === 'RELEASED'
                      ? 'badge-active'
                      : holdSalaryStatus === 'HELD'
                      ? 'badge-pending'
                      : 'badge-draft'
                  }`}
                  style={{
                    backgroundColor:
                      holdSalaryStatus === 'RELEASED'
                        ? 'rgba(34, 197, 94, 0.15)'
                        : holdSalaryStatus === 'HELD'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(148, 163, 184, 0.15)',
                    color:
                      holdSalaryStatus === 'RELEASED'
                        ? '#16a34a'
                        : holdSalaryStatus === 'HELD'
                        ? '#d97706'
                        : '#64748b',
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.6rem',
                  }}
                >
                  {holdSalaryStatus === 'RELEASED'
                    ? 'RELEASED'
                    : holdSalaryStatus === 'HELD'
                    ? 'HELD IN ESCROW'
                    : holdSalaryOnJoining
                    ? 'PENDING FIRST PAYROLL'
                    : 'NOT APPLICABLE'}
                </span>
              </div>
              <p className="text-muted text-xs" style={{ margin: '0.2rem 0 0 0' }}>
                {holdSalaryStatus === 'RELEASED'
                  ? `Released on ${holdSalaryReleasedAt ? new Date(holdSalaryReleasedAt).toLocaleDateString('en-IN') : '—'}: ${holdSalaryReleaseNotes || 'Settlement completed'}`
                  : heldSalaryBalance > 0
                  ? `Current Held Balance: ${formatINR(heldSalaryBalance)} (Deducted once upon joining; refundable when employee leaves)`
                  : holdSalaryOnJoining
                  ? 'Policy enabled: Will hold 15 days basic salary once in the joining month.'
                  : 'Policy disabled for this employee.'}
              </p>
            </div>
          </div>

          <div>
            {heldSalaryBalance > 0 && (
              <button
                type="button"
                onClick={() => {
                  setAmount(String(heldSalaryBalance));
                  setIsOpen(true);
                }}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#f59e0b',
                  borderColor: '#f59e0b',
                  color: '#ffffff',
                }}
              >
                <Unlock size={14} /> Release Held Salary
              </button>
            )}
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            className="glass-card-static animate-scale-in"
            style={{
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--bg-card, #1e293b)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Unlock size={20} style={{ color: '#f59e0b' }} />
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Release Held Salary</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-icon btn-sm"
                style={{ padding: '0.25rem' }}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-muted text-sm" style={{ marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Release 15-day joining salary hold for <strong>{employeeName}</strong>. If there is an active payroll cycle, this refund will be added directly to their gross salary and final slip.
            </p>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  borderRadius: '6px',
                  padding: '0.75rem',
                  fontSize: '0.85rem',
                  marginBottom: '1rem',
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRelease}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Release Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={heldSalaryBalance}
                  className="form-input font-mono"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
                <span className="text-xs text-muted">Maximum available to release: {formatINR(heldSalaryBalance)}</span>
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Release Notes / Settlement Reason</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Employee left company on 15 Sept 2026. Full & final settlement refund."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: '#fff' }}
                  disabled={loading}
                >
                  {loading ? 'Releasing...' : 'Confirm Release'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
