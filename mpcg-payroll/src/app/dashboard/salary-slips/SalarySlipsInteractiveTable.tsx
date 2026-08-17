'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Download, Mail, Send, CheckSquare, Square, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { sendSingleSalarySlipEmail, sendBulkSalarySlipEmails } from '@/actions/salary-slip-email';

interface SlipItem {
  id: string;
  payrollId: string;
  fileName: string;
  generatedAt: string;
  generatedBy: string | null;
  employee: {
    employeeId: string;
    name: string;
    email?: string | null;
    designation?: string | null;
  };
}

export default function SalarySlipsInteractiveTable({
  slips,
  queryStr,
}: {
  slips: SlipItem[];
  queryStr: string;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [modalResult, setModalResult] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    errors?: string[];
  } | null>(null);

  const allPayrollIds = slips.map(s => s.payrollId);
  const isAllSelected = slips.length > 0 && selectedIds.length === slips.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allPayrollIds);
    }
  };

  const toggleSelectRow = (payrollId: string) => {
    setSelectedIds(prev =>
      prev.includes(payrollId) ? prev.filter(id => id !== payrollId) : [...prev, payrollId]
    );
  };

  // Single Email Send
  const handleSendSingleEmail = async (payrollId: string, empName: string) => {
    setSendingId(payrollId);
    setModalResult(null);

    const res = await sendSingleSalarySlipEmail(payrollId);
    if (res.success) {
      setModalResult({
        type: 'success',
        title: 'Salary Slip Emailed!',
        message: `Successfully emailed salary slip to ${empName}.`,
      });
    } else {
      setModalResult({
        type: 'error',
        title: 'Email Delivery Failed',
        message: res.message,
      });
    }
    setSendingId(null);
  };

  // Bulk Email Send
  const handleSendBulkEmail = async (targetIds: string[], label: string) => {
    if (targetIds.length === 0) return;
    setBulkSending(true);
    setProgressMsg(`Sending salary slips to ${targetIds.length} employees... Please wait.`);
    setModalResult(null);

    const res = await sendBulkSalarySlipEmails(targetIds);

    if (res.success) {
      setModalResult({
        type: 'success',
        title: 'Bulk Email Delivery Complete!',
        message: res.message,
        errors: res.errors && res.errors.length > 0 ? res.errors : undefined,
      });
    } else {
      setModalResult({
        type: 'error',
        title: 'Bulk Email Failed',
        message: res.message,
        errors: res.errors,
      });
    }

    setBulkSending(false);
    setProgressMsg(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Action Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--card-bg)',
        padding: '0.875rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={toggleSelectAll}
            style={{ gap: '0.4rem' }}
          >
            {isAllSelected ? <CheckSquare size={16} color="#06b6d4" /> : <Square size={16} />}
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {selectedIds.length} of {slips.length} selected
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={bulkSending}
              onClick={() => handleSendBulkEmail(selectedIds, 'selected')}
              style={{ gap: '0.4rem', background: '#0284c7', borderColor: '#0284c7' }}
            >
              <Mail size={16} />
              Email Selected ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={bulkSending || slips.length === 0}
            onClick={() => handleSendBulkEmail(allPayrollIds, 'all')}
            style={{ gap: '0.4rem', background: '#059669', borderColor: '#059669' }}
          >
            <Send size={16} />
            Email All Salary Slips ({slips.length})
          </button>

          <Link
            href="/dashboard/settings/email"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', gap: '0.3rem' }}
            title="Configure SMTP Settings"
          >
            ⚙️ Email Settings
          </Link>
        </div>
      </div>

      {/* Status Modal / Toast */}
      {progressMsg && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: 'rgba(14,165,233,0.1)',
          border: '1px solid rgba(14,165,233,0.3)',
          color: '#0284c7',
          fontSize: '0.9rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <RefreshCw size={18} className="animate-spin" />
          <span>{progressMsg}</span>
        </div>
      )}

      {modalResult && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: modalResult.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${modalResult.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: modalResult.type === 'success' ? '#16a34a' : '#dc2626',
          fontSize: '0.875rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
            {modalResult.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span>{modalResult.title}</span>
          </div>
          <div>{modalResult.message}</div>
          {modalResult.errors && modalResult.errors.length > 0 && (
            <ul style={{ margin: '0.5rem 0 0 1.25rem', padding: 0, fontSize: '0.8rem' }}>
              {modalResult.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Salary Slips Data Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={toggleSelectAll}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
              </th>
              <th>Employee</th>
              <th>ID</th>
              <th>File Name</th>
              <th>Generated</th>
              <th>Generated By</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slips.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted" style={{ padding: '3rem' }}>
                  No salary slips generated for this month yet. Finalize payrolls first, then generate slips from the payroll page.
                </td>
              </tr>
            ) : (
              slips.map((slip) => {
                const isSelected = selectedIds.includes(slip.payrollId);
                const isSendingThis = sendingId === slip.payrollId;

                return (
                  <tr key={slip.id} style={{ background: isSelected ? 'rgba(6,182,212,0.04)' : undefined }}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(slip.payrollId)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      <div>{slip.employee.name}</div>
                      {slip.employee.email ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{slip.employee.email}</div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>No email set</div>
                      )}
                    </td>
                    <td className="font-mono text-muted">{slip.employee.employeeId}</td>
                    <td className="text-sm text-muted">
                      <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#ef4444' }} />
                      {slip.fileName}
                    </td>
                    <td className="text-sm text-muted">{slip.generatedAt}</td>
                    <td className="text-sm text-muted">{slip.generatedBy || '—'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isSendingThis || bulkSending || !slip.employee.email}
                          onClick={() => handleSendSingleEmail(slip.payrollId, slip.employee.name)}
                          style={{ gap: '0.3rem' }}
                          title={slip.employee.email ? `Email salary slip to ${slip.employee.email}` : 'Employee has no email address'}
                        >
                          <Mail size={14} style={{ color: '#0284c7' }} />
                          {isSendingThis ? 'Sending...' : 'Email'}
                        </button>

                        <Link
                          href={`/api/salary-slip/${slip.payrollId}${queryStr}`}
                          className="btn btn-primary btn-sm"
                          style={{ textDecoration: 'none', gap: '0.3rem' }}
                          target="_blank"
                        >
                          <Download size={14} /> Download
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
