'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  createPayrollPeriod,
  calculateAllPayrolls,
  approveAllPayrolls,
  generateAllSalarySlips,
  publishSalarySlipsToPortal,
  hideSalarySlipsFromPortal,
} from '@/actions/payroll';
import {
  Plus,
  Calculator,
  CheckCircle,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Sparkles,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PayrollActionsProps {
  month: number;
  year: number;
  publishedCount?: number;
  totalCount?: number;
}

interface ToastNotification {
  id: number;
  success: boolean;
  title: string;
  message: string;
}

interface ConfirmDialogState {
  title: string;
  description: string;
  confirmText: string;
  confirmAction: () => Promise<void>;
}

export default function PayrollActions({
  month,
  year,
  publishedCount = 0,
  totalCount = 0,
}: PayrollActionsProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState('');
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-dismiss toast notification after 5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const executeAction = async (action: string) => {
    setLoading(action);
    let result: { success: boolean; message: string } | undefined;

    try {
      switch (action) {
        case 'create':
          result = await createPayrollPeriod(month, year);
          break;
        case 'calculate':
          result = await calculateAllPayrolls(month, year);
          break;
        case 'approve':
          result = await approveAllPayrolls(month, year);
          break;
        case 'generate':
          result = await generateAllSalarySlips(month, year);
          break;
        case 'publish':
          result = await publishSalarySlipsToPortal(month, year);
          break;
        case 'hide':
          result = await hideSalarySlipsFromPortal(month, year);
          break;
      }

      if (result) {
        setToast({
          id: Date.now(),
          success: result.success,
          title: result.success ? 'Success' : 'Notice',
          message: result.message,
        });
      }
    } catch (err: unknown) {
      setToast({
        id: Date.now(),
        success: false,
        title: 'Action Failed',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      router.refresh();
      setLoading('');
    }
  };

  const handleAction = (action: string) => {
    if (action === 'approve') {
      setConfirmDialog({
        title: 'Approve All Payrolls',
        description: `Are you sure you want to approve calculated payroll records for ${month}/${year}?`,
        confirmText: 'Approve All',
        confirmAction: async () => {
          setConfirmDialog(null);
          await executeAction('approve');
        },
      });
      return;
    }

    if (action === 'generate') {
      setConfirmDialog({
        title: 'Finalize & Generate All Slips',
        description: `This will finalize all payroll calculations and generate official PDF salary slips for ${month}/${year}. Slips will be prepared but will NOT be visible to employees until you explicitly click "Show Slips in Portal".`,
        confirmText: 'Generate All Slips',
        confirmAction: async () => {
          setConfirmDialog(null);
          await executeAction('generate');
        },
      });
      return;
    }

    if (action === 'hide') {
      setConfirmDialog({
        title: 'Hide Slips from Portal',
        description: `Are you sure you want to hide salary slips for ${month}/${year} from the Employee Portal? Slips will remain generated in the system but hidden from employee accounts until published again.`,
        confirmText: 'Hide from Portal',
        confirmAction: async () => {
          setConfirmDialog(null);
          await executeAction('hide');
        },
      });
      return;
    }

    executeAction(action);
  };

  const handleMonthChange = (newMonth: number, newYear: number) => {
    try {
      document.cookie = `mpcg_payroll_month=${newMonth}; path=/; max-age=31536000; SameSite=Lax`;
      document.cookie = `mpcg_payroll_year=${newYear}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('month', String(newMonth));
      url.searchParams.set('year', String(newYear));
      router.push(url.pathname + url.search);
    } else {
      router.push(`/dashboard/payroll?month=${newMonth}&year=${newYear}`);
    }
  };

  const isSlipsVisible = publishedCount > 0;

  // Render floating non-blocking notification toast (NO dark backdrop, NO blur!)
  const toastContent = toast ? (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 999999,
        maxWidth: '430px',
        width: 'calc(100vw - 40px)',
        backgroundColor: '#0f172a',
        border: toast.success
          ? '1px solid rgba(16, 185, 129, 0.45)'
          : '1px solid rgba(239, 68, 68, 0.45)',
        borderRadius: '14px',
        padding: '14px 16px',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.8), 0 0 25px rgba(2, 132, 199, 0.18)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          backgroundColor: toast.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          color: toast.success ? '#10b981' : '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {toast.success ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
      </div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: '1px' }}>
        <div
          style={{
            fontSize: '0.9rem',
            fontWeight: 700,
            color: '#f8fafc',
            marginBottom: '3px',
          }}
        >
          {toast.title}
        </div>
        <div
          style={{
            fontSize: '0.8rem',
            color: '#cbd5e1',
            lineHeight: 1.45,
            wordBreak: 'break-word',
          }}
        >
          {toast.message}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setToast(null)}
        style={{
          background: 'rgba(255, 255, 255, 0.06)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '6px',
          color: '#94a3b8',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: '4px',
        }}
        title="Dismiss"
      >
        <X size={15} />
      </button>
    </div>
  ) : null;

  // Clean confirmation modal (without backdrop blur)
  const confirmModalContent = confirmDialog ? (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(3, 7, 18, 0.65)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        boxSizing: 'border-box',
      }}
      onClick={() => setConfirmDialog(null)}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(2, 132, 199, 0.12)',
          position: 'relative',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => setConfirmDialog(null)}
          type="button"
          style={{
            position: 'absolute',
            top: '0.875rem',
            right: '0.875rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '8px',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Close dialog"
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(2, 132, 199, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8',
            }}
          >
            <Sparkles size={20} />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
            {confirmDialog.title}
          </h3>
        </div>

        <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#94a3b8', lineHeight: 1.5 }}>
          {confirmDialog.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={() => setConfirmDialog(null)}
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ minWidth: '80px' }}
          >
            Cancel
          </button>
          <button
            onClick={confirmDialog.confirmAction}
            type="button"
            className="btn btn-primary btn-sm"
            style={{ minWidth: '100px' }}
          >
            {confirmDialog.confirmText}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="flex-gap" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          className="form-select"
          style={{ width: '130px' }}
          value={month}
          onChange={(e) => handleMonthChange(parseInt(e.target.value), year)}
        >
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>

        <select
          className="form-select"
          style={{ width: '100px' }}
          value={year}
          onChange={(e) => handleMonthChange(month, parseInt(e.target.value))}
        >
          {[2024, 2025, 2026, 2027].map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <button
          onClick={() => handleAction('create')}
          className="btn btn-secondary btn-sm"
          disabled={!!loading}
        >
          {loading === 'create' ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
          {loading === 'create' ? 'Creating...' : 'Create Period'}
        </button>

        <button
          onClick={() => handleAction('calculate')}
          className="btn btn-primary btn-sm"
          disabled={!!loading}
          title="Calculate salaries, deductions, overtime and net pay for all employees"
        >
          {loading === 'calculate' ? <Loader2 size={14} className="spin" /> : <Calculator size={14} />}
          {loading === 'calculate' ? 'Calculating...' : 'Calculate All'}
        </button>

        <button
          onClick={() => handleAction('approve')}
          className="btn btn-success btn-sm"
          disabled={!!loading}
          style={{ opacity: 0.9 }}
        >
          {loading === 'approve' ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
          {loading === 'approve' ? 'Approving...' : 'Approve All'}
        </button>

        <button
          onClick={() => handleAction('generate')}
          className="btn btn-primary btn-sm"
          style={{ backgroundColor: '#06b6d4', borderColor: '#0891b2' }}
          disabled={!!loading}
          title="Generate all official salary slip PDFs"
        >
          {loading === 'generate' ? <Loader2 size={14} className="spin" /> : <FileText size={14} />}
          {loading === 'generate' ? 'Generating...' : 'Generate All Slips'}
        </button>

        {/* ============================================================ */}
        {/* OPTION / BUTTON TO SHOW SALARY SLIPS IN EMPLOYEE PORTAL */}
        {/* ============================================================ */}
        {!isSlipsVisible ? (
          <button
            onClick={() => handleAction('publish')}
            className="btn btn-sm"
            disabled={!!loading}
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#ffffff',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
              border: '1px solid #38bdf8',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Publish all calculated salary slips to the Employee Portal so staff can view and download them"
          >
            {loading === 'publish' ? (
              <Loader2 size={14} className="spin" />
            ) : (
              <Eye size={14} style={{ color: '#bae6fd' }} />
            )}
            {loading === 'publish' ? 'Publishing...' : 'Show Slips in Portal'}
          </button>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => handleAction('publish')}
              className="btn btn-sm"
              disabled={!!loading}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                fontWeight: 700,
                border: '1px solid #34d399',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              title="Click to sync/re-publish latest calculations to the portal"
            >
              {loading === 'publish' ? (
                <Loader2 size={14} className="spin" />
              ) : (
                <CheckCircle2 size={14} style={{ color: '#a7f3d0' }} />
              )}
              {loading === 'publish' ? 'Updating...' : `✓ Slips Visible in Portal (${publishedCount})`}
            </button>

            <button
              onClick={() => handleAction('hide')}
              className="btn btn-ghost btn-sm"
              disabled={!!loading}
              style={{
                color: '#fb7185',
                borderColor: 'rgba(244, 63, 94, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
              }}
              title="Hide slips from portal if you need to recalculate"
            >
              {loading === 'hide' ? <Loader2 size={12} className="spin" /> : <EyeOff size={13} />}
              {loading === 'hide' ? 'Hiding...' : 'Hide Slips'}
            </button>
          </div>
        )}

        <a
          href={`/api/payroll/export-excel?month=${month}&year=${year}`}
          download={`MPCG_Payroll_Report_${month}_${year}.xlsx`}
          className="btn btn-sm"
          style={{
            backgroundColor: '#059669',
            color: '#ffffff',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
          }}
          title="Download comprehensive Excel report for this month"
        >
          <FileSpreadsheet size={14} />
          Export Excel
        </a>
      </div>

      {/* Render Floating Toast (no background blur/dimming) */}
      {mounted && typeof document !== 'undefined' && toastContent && createPortal(toastContent, document.body)}

      {/* Render Confirmation Modal via Portal without blur */}
      {mounted && typeof document !== 'undefined' && confirmModalContent && createPortal(confirmModalContent, document.body)}
    </>
  );
}
