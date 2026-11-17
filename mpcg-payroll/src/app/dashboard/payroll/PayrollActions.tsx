'use client';

import { useState } from 'react';
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

export default function PayrollActions({
  month,
  year,
  publishedCount = 0,
  totalCount = 0,
}: PayrollActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState('');
  const [modalFeedback, setModalFeedback] = useState<{
    open: boolean;
    success: boolean;
    title: string;
    message: string;
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    confirmAction: () => Promise<void>;
  } | null>(null);

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
        setModalFeedback({
          open: true,
          success: result.success,
          title: result.success ? 'Success' : 'Notice',
          message: result.message,
        });
      }
    } catch (err: unknown) {
      setModalFeedback({
        open: true,
        success: false,
        title: 'Operation Failed',
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
        open: true,
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
        open: true,
        title: 'Finalize & Generate All Slips',
        description: `This will finalize all payroll calculations and generate official PDF salary slips for ${month}/${year}.`,
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
        open: true,
        title: 'Hide Slips from Portal',
        description: `Are you sure you want to hide salary slips for ${month}/${year} from the Employee Portal? Slips will return to "CALCULATED" status until published again.`,
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

      {/* Confirmation Modal */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #334155',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            }}
          >
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
                className="btn btn-secondary btn-sm"
                style={{ minWidth: '80px' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDialog.confirmAction}
                className="btn btn-primary btn-sm"
                style={{ minWidth: '100px' }}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Notification / Feedback Dialog */}
      {modalFeedback && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#0f172a',
              border: modalFeedback.success ? '1px solid #059669' : '1px solid #e11d48',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: modalFeedback.success
                  ? 'rgba(5, 150, 105, 0.15)'
                  : 'rgba(225, 29, 72, 0.15)',
                color: modalFeedback.success ? '#10b981' : '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              {modalFeedback.success ? <CheckCircle2 size={28} /> : <AlertCircle size={28} />}
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#f8fafc' }}>
              {modalFeedback.title}
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#cbd5e1', lineHeight: 1.5 }}>
              {modalFeedback.message}
            </p>
            <button
              onClick={() => setModalFeedback(null)}
              className="btn btn-primary"
              style={{ minWidth: '120px' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
