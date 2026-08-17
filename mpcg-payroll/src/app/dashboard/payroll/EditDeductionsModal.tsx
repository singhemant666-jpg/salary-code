'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { updatePayrollDeductions } from '@/actions/payroll';
import { Edit2, X, Check } from 'lucide-react';
import { formatINR } from '@/lib/currency-utils';

interface EditDeductionsModalProps {
  payroll: {
    id: string;
    employeeName: string;
    employeeId: string;
    grossSalary: number;
    lopDeduction: number;
    advanceDeduction: number;
    otherDeduction: number;
    otherDeductionNote: string | null;
    pfDeduction: number;
    totalDeduction: number;
    netSalary: number;
  };
}

export default function EditDeductionsModal({ payroll }: EditDeductionsModalProps) {
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

  const gross = Number(payroll.grossSalary || 0);
  const lop = Number(payroll.lopDeduction || 0);
  const otherVal = parseFloat(otherDeduction) || 0;
  const advanceVal = parseFloat(advanceDeduction) || 0;
  const pfVal = parseFloat(pfDeduction) || 0;

  const computedTotalDeduction = lop + otherVal + advanceVal + pfVal;
  const computedNetSalary = Math.max(0, gross - computedTotalDeduction);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await updatePayrollDeductions(payroll.id, {
      otherDeduction: otherVal,
      otherDeductionNote,
      advanceDeduction: advanceVal,
      pfDeduction: pfVal,
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
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        overflowY: 'auto',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setIsOpen(false);
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-secondary)',
          borderRadius: '16px',
          boxShadow: 'var(--shadow-xl, 0 25px 50px -12px rgba(0, 0, 0, 0.25))',
          padding: '1.75rem',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div className="flex-between" style={{ marginBottom: '1.25rem', borderBottom: '1px solid var(--border-primary)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Edit Salary Deductions
            </h2>
            <p className="text-xs text-muted" style={{ marginTop: '0.1rem' }}>
              {payroll.employeeName} ({payroll.employeeId})
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="btn btn-ghost btn-icon"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Other / Custom Deduction (₹)</label>
              <input
                type="number"
                step="0.01"
                className="form-input font-mono"
                value={otherDeduction}
                onChange={(e) => setOtherDeduction(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Deduction Reason / Note</label>
              <input
                type="text"
                className="form-input"
                value={otherDeductionNote}
                onChange={(e) => setOtherDeductionNote(e.target.value)}
                placeholder="e.g. Late penalty, Uniform cost, Loss deduction"
              />
            </div>

            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Advance Repayment (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input font-mono"
                  value={advanceDeduction}
                  onChange={(e) => setAdvanceDeduction(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">PF / ESI Deduction (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-input font-mono"
                  value={pfDeduction}
                  onChange={(e) => setPfDeduction(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div
              style={{
                background: 'rgba(6,182,212,0.06)',
                border: '1px solid rgba(6,182,212,0.2)',
                borderRadius: '10px',
                padding: '0.875rem 1rem',
                fontSize: '0.85rem',
              }}
            >
              <div className="flex-between" style={{ color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                <span>Gross Salary:</span>
                <span className="font-mono">{formatINR(gross)}</span>
              </div>
              <div className="flex-between" style={{ color: '#f59e0b', marginBottom: '0.3rem' }}>
                <span>LOP Deduction:</span>
                <span className="font-mono">-{formatINR(lop)}</span>
              </div>
              <div className="flex-between" style={{ color: '#ef4444', fontWeight: 600 }}>
                <span>Total Deductions:</span>
                <span className="font-mono">-{formatINR(computedTotalDeduction)}</span>
              </div>
              <div
                className="flex-between"
                style={{
                  borderTop: '1px solid rgba(6,182,212,0.2)',
                  paddingTop: '0.4rem',
                  marginTop: '0.5rem',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Updated Net Salary:</span>
                <span className="font-mono" style={{ fontWeight: 700, fontSize: '1.1rem', color: '#06b6d4' }}>
                  {formatINR(computedNetSalary)}
                </span>
              </div>
            </div>

            <div className="flex-gap" style={{ justifyContent: 'flex-end' }}>
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
                disabled={loading}
              >
                <Check size={16} /> {loading ? 'Saving...' : 'Save Deductions'}
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
