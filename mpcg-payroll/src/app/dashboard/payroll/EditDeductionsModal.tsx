'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updatePayrollDeductions } from '@/actions/payroll';
import type { PaidLeaveBalanceInfo } from '@/actions/payroll';
import { Edit2, X, Check, Gift, AlertCircle } from 'lucide-react';
import { formatINR } from '@/lib/currency-utils';

interface EditDeductionsModalProps {
  payroll: {
    id: string;
    employeeName: string;
    employeeId: string;
    grossSalary: number;
    lopDeduction: number;
    lopDays: number;
    shortHoursDeduction?: number;
    advanceDeduction: number;
    otherDeduction: number;
    otherDeductionNote: string | null;
    pfDeduction: number;
    totalDeduction: number;
    netSalary: number;
    basicSalary?: number;
    paidLeaveAdjustment?: number;
    holdSalaryDeduction?: number;
  };
  leaveBalance: PaidLeaveBalanceInfo;
}

export default function EditDeductionsModal({ payroll, leaveBalance }: EditDeductionsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [otherDeduction, setOtherDeduction] = useState<string>(String(payroll.otherDeduction || 0));
  const [otherDeductionNote, setOtherDeductionNote] = useState<string>(payroll.otherDeductionNote || '');
  const [advanceDeduction, setAdvanceDeduction] = useState<string>(String(payroll.advanceDeduction || 0));
  const [pfDeduction, setPfDeduction] = useState<string>(String(payroll.pfDeduction || 0));
  const [paidLeaveAdj, setPaidLeaveAdj] = useState<string>(String(payroll.paidLeaveAdjustment || 0));
  const [holdSalaryDeduction, setHoldSalaryDeduction] = useState<string>(String(payroll.holdSalaryDeduction || 0));

  const gross = Number(payroll.grossSalary || 0);
  const lopDays = Number(payroll.lopDays || 0);

  // Enforce: max 1 per 2-month period AND annual remaining AND actual LOP days
  const effectiveMax = Math.min(leaveBalance.maxForThisMonth, lopDays);
  const adjDays = Math.min(Math.max(0, parseFloat(paidLeaveAdj) || 0), effectiveMax);

  // Per-day LOP value based on Basic Salary / 30 (e.g. ₹45,000 / 30 = ₹1,500/day)
  const basicSalaryVal = Number(payroll.basicSalary || payroll.grossSalary || 0);
  const lopPerDay = basicSalaryVal > 0 ? (basicSalaryVal / 30) : (lopDays > 0 ? Number(payroll.lopDeduction) / lopDays : 0);
  const adjustedLopDeduction = Math.max(0, Number(payroll.lopDeduction) - adjDays * lopPerDay);
  const savedAmount = adjDays * lopPerDay;

  const otherVal = parseFloat(otherDeduction) || 0;
  const advanceVal = parseFloat(advanceDeduction) || 0;
  const pfVal = parseFloat(pfDeduction) || 0;
  const holdVal = parseFloat(holdSalaryDeduction) || 0;
  const shortVal = Number(payroll.shortHoursDeduction || 0);

  const computedTotalDeduction = adjustedLopDeduction + shortVal + otherVal + advanceVal + pfVal + holdVal;
  const computedNetSalary = Math.max(0, gross - computedTotalDeduction);

  const canAdjust = lopDays > 0 && leaveBalance.maxForThisMonth > 0;
  const periodBlocked = lopDays > 0 && leaveBalance.usedInPeriod >= 1 && (payroll.paidLeaveAdjustment || 0) === 0;
  const annualExhausted = leaveBalance.remainingAnnual <= 0 && (payroll.paidLeaveAdjustment || 0) === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await updatePayrollDeductions(payroll.id, {
      otherDeduction: otherVal,
      otherDeductionNote,
      advanceDeduction: advanceVal,
      pfDeduction: pfVal,
      paidLeaveAdjustment: adjDays,
      holdSalaryDeduction: holdVal,
    });

    setLoading(false);
    if (res.success) {
      setIsOpen(false);
    } else {
      alert(res.message);
    }
  };

  const modalContent = isOpen ? (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem', overflowY: 'auto',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%', maxWidth: '540px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
          padding: '1.75rem', maxHeight: '92vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Edit Salary Deductions</h2>
            <p className="text-xs text-muted" style={{ marginTop: '0.1rem' }}>{payroll.employeeName} ({payroll.employeeId})</p>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="btn btn-ghost btn-icon"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>

            {/* Paid Leave Adjustment Section */}
            {lopDays > 0 && (
              <div style={{
                background: canAdjust ? 'rgba(22,163,74,0.06)' : 'rgba(148,163,184,0.06)',
                border: `1.5px solid ${canAdjust ? 'rgba(22,163,74,0.3)' : 'rgba(148,163,184,0.2)'}`,
                borderRadius: '12px', padding: '1rem',
              }}>
                {/* Title Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Gift size={16} style={{ color: canAdjust ? '#16a34a' : '#94a3b8' }} />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: canAdjust ? '#16a34a' : '#94a3b8' }}>
                    Paid Leave Adjustment
                  </span>
                  <span style={{
                    background: canAdjust ? 'rgba(22,163,74,0.12)' : 'rgba(148,163,184,0.15)',
                    color: canAdjust ? '#16a34a' : '#94a3b8',
                    fontSize: '0.7rem', fontWeight: 700, borderRadius: '20px', padding: '0.1rem 0.5rem',
                  }}>
                    REDUCES LOP
                  </span>
                </div>

                {/* Annual Balance Pills */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <div style={{
                    background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Annual Total: </span>
                    <strong style={{ color: '#0891b2' }}>{leaveBalance.annualTotal} leaves</strong>
                  </div>
                  <div style={{
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Used: </span>
                    <strong style={{ color: '#d97706' }}>{leaveBalance.usedThisYear}</strong>
                  </div>
                  <div style={{
                    background: leaveBalance.remainingAnnual > 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                    border: `1px solid ${leaveBalance.remainingAnnual > 0 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Remaining: </span>
                    <strong style={{ color: leaveBalance.remainingAnnual > 0 ? '#16a34a' : '#dc2626' }}>
                      {leaveBalance.remainingAnnual}
                    </strong>
                  </div>
                  <div style={{
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                    borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem',
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Period: </span>
                    <strong style={{ color: '#7c3aed' }}>{leaveBalance.periodLabel}</strong>
                  </div>
                </div>

                {/* Blocked state */}
                {(periodBlocked || annualExhausted) && (
                  <div style={{
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
                    background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#dc2626',
                  }}>
                    <AlertCircle size={14} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                    <span>
                      {annualExhausted
                        ? 'All 6 annual paid leaves have been used this year.'
                        : `A paid leave was already used in the ${leaveBalance.periodLabel} period. Next adjustment available from ${leaveBalance.periodLabel.split('-')[1]}.`}
                    </span>
                  </div>
                )}

                {/* Active adjustment input */}
                {canAdjust && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                      <label className="form-label">
                        Apply Leave Days (max {effectiveMax} — 1 per {leaveBalance.periodLabel} period)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max={effectiveMax}
                        className="form-input font-mono"
                        value={paidLeaveAdj}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value) || 0;
                          setPaidLeaveAdj(String(Math.min(v, effectiveMax)));
                        }}
                        placeholder="0"
                      />
                    </div>
                    {adjDays > 0 && (
                      <div style={{
                        textAlign: 'center', padding: '0.5rem 0.75rem',
                        background: 'rgba(22,163,74,0.1)', borderRadius: '8px', minWidth: '110px',
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Employee Saves</div>
                        <div style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}>+{formatINR(savedAmount)}</div>
                      </div>
                    )}
                  </div>
                )}

                {/* Already applied adjustment */}
                {!canAdjust && (payroll.paidLeaveAdjustment || 0) > 0 && (
                  <div style={{ fontSize: '0.82rem', color: '#16a34a', fontWeight: 600 }}>
                    ✓ {payroll.paidLeaveAdjustment} day(s) already adjusted this period
                  </div>
                )}
              </div>
            )}

            {/* Other Deduction */}
            <div className="form-group">
              <label className="form-label">Other / Custom Deduction (₹)</label>
              <input
                type="number" step="0.01" className="form-input font-mono"
                value={otherDeduction}
                onChange={(e) => setOtherDeduction(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deduction Reason / Note</label>
              <input
                type="text" className="form-input"
                value={otherDeductionNote}
                onChange={(e) => setOtherDeductionNote(e.target.value)}
                placeholder="e.g. Late penalty, Uniform cost"
              />
            </div>

            {/* Joining Salary Hold */}
            <div className="form-group">
              <label className="form-label" style={{ color: '#d97706', fontWeight: 600 }}>
                Joining Salary Hold — 15 Days (₹)
              </label>
              <input
                type="number" step="0.01" className="form-input font-mono"
                value={holdSalaryDeduction}
                onChange={(e) => setHoldSalaryDeduction(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted" style={{ marginTop: '0.2rem' }}>
                15 days salary hold at joining. Set to 0 to release held salary.
              </p>
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Advance Repayment (₹)</label>
                <input
                  type="number" step="0.01" className="form-input font-mono"
                  value={advanceDeduction}
                  onChange={(e) => setAdvanceDeduction(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label className="form-label">PF / ESI Deduction (₹)</label>
                <input
                  type="number" step="0.01" className="form-input font-mono"
                  value={pfDeduction}
                  onChange={(e) => setPfDeduction(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div style={{
              background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)',
              borderRadius: '10px', padding: '0.875rem 1rem', fontSize: '0.85rem',
            }}>
              <div className="flex-between" style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                <span>Gross Salary:</span>
                <span className="font-mono">{formatINR(gross)}</span>
              </div>
              <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                <span>LOP Deduction{adjDays > 0 ? ` (after ${adjDays}d leave)` : ''}:</span>
                <span className="font-mono">-{formatINR(adjustedLopDeduction)}</span>
              </div>
              {adjDays > 0 && (
                <div className="flex-between" style={{ color: '#16a34a', marginBottom: '0.3rem' }}>
                  <span>Paid Leave Benefit:</span>
                  <span className="font-mono">+{formatINR(savedAmount)}</span>
                </div>
              )}
              <div className="flex-between" style={{ color: '#ef4444', fontWeight: 600 }}>
                <span>Total Deductions:</span>
                <span className="font-mono">-{formatINR(computedTotalDeduction)}</span>
              </div>
              <div className="flex-between" style={{
                borderTop: '1px solid rgba(6,182,212,0.2)', paddingTop: '0.4rem', marginTop: '0.5rem',
              }}>
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Updated Net Salary:</span>
                <span className="font-mono" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#06b6d4' }}>
                  {formatINR(computedNetSalary)}
                </span>
              </div>
            </div>

            <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary" disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Check size={16} /> {loading ? 'Saving...' : 'Save & Recalculate'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn btn-secondary btn-sm"
        title="Edit Deductions"
        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', gap: '0.3rem' }}
      >
        <Edit2 size={13} /> Edit Deductions
      </button>
      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
