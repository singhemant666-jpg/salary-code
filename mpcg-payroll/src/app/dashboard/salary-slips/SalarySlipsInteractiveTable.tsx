'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Download,
  Mail,
  Send,
  CheckSquare,
  Square,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Search,
  X,
  Clock,
  Phone,
} from 'lucide-react';
import { sendSingleSalarySlipEmail, sendBulkSalarySlipEmails } from '@/actions/salary-slip-email';
import { sendSalarySlipWhatsAppAPI, recordSalarySlipWhatsAppSent } from '@/actions/salary-slip-whatsapp';

export interface SlipItem {
  id: string;
  payrollId: string;
  fileName: string;
  generatedAt: string;
  generatedBy: string | null;
  emailSentAt?: string | null;
  emailSentTo?: string | null;
  emailSendCount?: number;
  whatsappSentAt?: string | null;
  whatsappSentTo?: string | null;
  whatsappSendCount?: number;
  isDelivered?: boolean;
  employee: {
    employeeId: string;
    name: string;
    email?: string | null;
    mobile?: string | null;
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
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'delivered' | 'pending'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [localDeliveryStatus, setLocalDeliveryStatus] = useState<
    Record<string, { emailSentAt?: string; whatsappSentAt?: string }>
  >({});
  const [modalResult, setModalResult] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
    errors?: string[];
    whatsappUrl?: string;
  } | null>(null);

  // Delivered and pending counts computed live with local status updates
  const deliveredCount = useMemo(() => {
    return slips.filter((s) => {
      const local = localDeliveryStatus[s.payrollId];
      return Boolean(s.isDelivered || local?.emailSentAt || local?.whatsappSentAt);
    }).length;
  }, [slips, localDeliveryStatus]);

  const pendingCount = slips.length - deliveredCount;

  // Filter slips by Tab (All, Delivered, Pending) and Search query
  const filteredSlips = useMemo(() => {
    let list = slips;

    if (filterTab === 'delivered') {
      list = list.filter((s) => {
        const local = localDeliveryStatus[s.payrollId];
        return Boolean(s.isDelivered || local?.emailSentAt || local?.whatsappSentAt);
      });
    } else if (filterTab === 'pending') {
      list = list.filter((s) => {
        const local = localDeliveryStatus[s.payrollId];
        return !s.isDelivered && !local?.emailSentAt && !local?.whatsappSentAt;
      });
    }

    const q = search.trim().toLowerCase();
    if (!q) return list;

    return list.filter((s) => {
      const name = (s.employee.name || '').toLowerCase();
      const empId = (s.employee.employeeId || '').toLowerCase();
      const designation = (s.employee.designation || '').toLowerCase();
      const email = (s.employee.email || '').toLowerCase();
      const mobile = (s.employee.mobile || '').toLowerCase();
      const fileName = (s.fileName || '').toLowerCase();
      return (
        name.includes(q) ||
        empId.includes(q) ||
        designation.includes(q) ||
        email.includes(q) ||
        mobile.includes(q) ||
        fileName.includes(q)
      );
    });
  }, [slips, search, filterTab, localDeliveryStatus]);

  const allFilteredPayrollIds = filteredSlips.map((s) => s.payrollId);
  const isAllSelected =
    filteredSlips.length > 0 &&
    filteredSlips.every((s) => selectedIds.includes(s.payrollId));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const filteredSet = new Set(allFilteredPayrollIds);
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredPayrollIds])));
    }
  };

  const toggleSelectRow = (payrollId: string) => {
    setSelectedIds((prev) =>
      prev.includes(payrollId) ? prev.filter((id) => id !== payrollId) : [...prev, payrollId]
    );
  };

  // Single Email Send
  const handleSendSingleEmail = async (payrollId: string, empName: string) => {
    setSendingId(payrollId);
    setModalResult(null);

    const res = await sendSingleSalarySlipEmail(payrollId);
    if (res.success) {
      const timestamp = new Date().toLocaleString('en-IN');
      setLocalDeliveryStatus((prev) => ({
        ...prev,
        [payrollId]: { ...prev[payrollId], emailSentAt: timestamp },
      }));
      setModalResult({
        type: 'success',
        title: 'Salary Slip Emailed!',
        message: `Successfully emailed salary slip to ${empName}. Delivery record updated.`,
      });
      router.refresh();
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
      const timestamp = new Date().toLocaleString('en-IN');
      setLocalDeliveryStatus((prev) => {
        const next = { ...prev };
        for (const id of targetIds) {
          next[id] = { ...next[id], emailSentAt: timestamp };
        }
        return next;
      });

      setModalResult({
        type: 'success',
        title: 'Bulk Email Delivery Complete!',
        message: res.message,
        errors: res.errors && res.errors.length > 0 ? res.errors : undefined,
      });
      setSelectedIds([]);
      router.refresh();
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

  // WhatsApp Send / Open
  const handleWhatsApp = async (slip: SlipItem) => {
    setSendingId(slip.payrollId);
    setModalResult(null);

    const baseUrl = window.location.origin;
    const res = await sendSalarySlipWhatsAppAPI(slip.payrollId, baseUrl);

    // Record that WhatsApp dispatch was triggered
    await recordSalarySlipWhatsAppSent(slip.payrollId, slip.employee.mobile || undefined);
    const timestamp = new Date().toLocaleString('en-IN');
    setLocalDeliveryStatus((prev) => ({
      ...prev,
      [slip.payrollId]: { ...prev[slip.payrollId], whatsappSentAt: timestamp },
    }));

    // Only redirect/open WhatsApp Web if automated API was NOT sent (e.g. manual fallback or disabled API)
    if (!res.sentViaApi && res.whatsappUrl) {
      window.open(res.whatsappUrl, '_blank');
    }

    setModalResult({
      type: res.success ? 'success' : 'error',
      title: res.sentViaApi ? 'WhatsApp Template Sent' : (res.success ? 'WhatsApp Share' : 'WhatsApp Notice'),
      message: res.message,
      whatsappUrl: res.whatsappUrl,
    });

    setSendingId(null);
    router.refresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Filter Tabs & Action Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
          background: 'var(--card-bg)',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Row 1: Delivery Status Tabs & Statistics */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: filterTab === 'all' ? '#06b6d4' : 'var(--border-color)',
                background: filterTab === 'all' ? 'rgba(6,182,212,0.15)' : 'transparent',
                color: filterTab === 'all' ? '#06b6d4' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <span>All Slips</span>
              <span
                style={{
                  background: 'var(--badge-bg, rgba(255,255,255,0.08))',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                }}
              >
                {slips.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('delivered')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: filterTab === 'delivered' ? '#16a34a' : 'var(--border-color)',
                background: filterTab === 'delivered' ? 'rgba(22,163,74,0.15)' : 'transparent',
                color: filterTab === 'delivered' ? '#16a34a' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <CheckCircle size={14} />
              <span>Delivered</span>
              <span
                style={{
                  background: 'rgba(22,163,74,0.2)',
                  color: '#22c55e',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                }}
              >
                {deliveredCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFilterTab('pending')}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: filterTab === 'pending' ? '#f59e0b' : 'var(--border-color)',
                background: filterTab === 'pending' ? 'rgba(245,158,11,0.15)' : 'transparent',
                color: filterTab === 'pending' ? '#f59e0b' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Clock size={14} />
              <span>Pending</span>
              <span
                style={{
                  background: 'rgba(245,158,11,0.2)',
                  color: '#f59e0b',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                }}
              >
                {pendingCount}
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Link
              href="/dashboard/settings/email"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', gap: '0.35rem', fontSize: '0.8rem' }}
              title="Configure SMTP Settings"
            >
              ⚙️ Email Settings
            </Link>
          </div>
        </div>

        {/* Row 2: Search, Selection & Dispatch Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={toggleSelectAll}
              style={{ gap: '0.4rem', whiteSpace: 'nowrap' }}
            >
              {isAllSelected ? <CheckSquare size={16} color="#06b6d4" /> : <Square size={16} />}
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
              {selectedIds.length} of {filteredSlips.length} selected
              {search && filteredSlips.length !== slips.length ? ` (${filteredSlips.length} matching)` : ''}
            </span>

            {/* Search Box */}
            <div
              className="search-bar"
              style={{
                position: 'relative',
                flex: 1,
                minWidth: '220px',
                maxWidth: '360px',
              }}
            >
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search employee, ID, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setSearch('');
                }}
                style={{
                  paddingLeft: '2.2rem',
                  paddingRight: search ? '2.2rem' : '0.75rem',
                  width: '100%',
                  fontSize: '0.85rem',
                  height: '34px',
                  borderRadius: '8px',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px',
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
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
                <Mail size={15} />
                Email Selected ({selectedIds.length})
              </button>
            )}

            {filterTab === 'pending' ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={bulkSending || filteredSlips.length === 0}
                onClick={() => handleSendBulkEmail(allFilteredPayrollIds, 'pending')}
                style={{ gap: '0.4rem', background: '#f59e0b', borderColor: '#f59e0b', color: '#111' }}
              >
                <Send size={15} />
                Email All Pending ({filteredSlips.length})
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={bulkSending || slips.length === 0}
                onClick={() => handleSendBulkEmail(slips.map((s) => s.payrollId), 'all')}
                style={{ gap: '0.4rem', background: '#059669', borderColor: '#059669' }}
              >
                <Send size={15} />
                Email All Salary Slips ({slips.length})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Modal / Toast */}
      {progressMsg && (
        <div
          style={{
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
          }}
        >
          <RefreshCw size={18} className="animate-spin" />
          <span>{progressMsg}</span>
        </div>
      )}

      {modalResult && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '10px',
            background: modalResult.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${modalResult.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: modalResult.type === 'success' ? '#16a34a' : '#dc2626',
            fontSize: '0.875rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
              {modalResult.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{modalResult.title}</span>
            </div>

            {modalResult.whatsappUrl && (
              <a
                href={modalResult.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm"
                style={{
                  background: '#25D366',
                  borderColor: '#25D366',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  textDecoration: 'none',
                  fontWeight: 600,
                  borderRadius: '8px',
                  padding: '0.4rem 0.85rem',
                }}
              >
                <MessageSquare size={15} />
                Open in WhatsApp Web / App ↗
              </a>
            )}
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

      {/* Salary Slips Data Table with Delivery Record Column */}
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
              <th>Delivery Status</th>
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
            ) : filteredSlips.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted" style={{ padding: '3rem' }}>
                  {filterTab === 'pending'
                    ? '🎉 All salary slips have been delivered!'
                    : filterTab === 'delivered'
                    ? 'No delivered salary slips found matching your filters.'
                    : `No employees found matching "${search}".`}
                </td>
              </tr>
            ) : (
              filteredSlips.map((slip) => {
                const isSelected = selectedIds.includes(slip.payrollId);
                const isSendingThis = sendingId === slip.payrollId;

                const local = localDeliveryStatus[slip.payrollId];
                const emailSentAt = local?.emailSentAt || slip.emailSentAt;
                const whatsappSentAt = local?.whatsappSentAt || slip.whatsappSentAt;
                const hasBeenDelivered = Boolean(emailSentAt || whatsappSentAt);

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
                      <div style={{ color: 'var(--text-primary)' }}>{slip.employee.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '2px', flexWrap: 'wrap' }}>
                        {slip.employee.email ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{slip.employee.email}</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>No email set</span>
                        )}
                        {slip.employee.mobile && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                            <Phone size={10} /> {slip.employee.mobile}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-muted">{slip.employee.employeeId}</td>
                    <td className="text-sm text-muted">
                      <FileText size={14} style={{ verticalAlign: 'middle', marginRight: '0.5rem', color: '#ef4444' }} />
                      {slip.fileName}
                    </td>
                    <td className="text-sm text-muted">
                      <div>{slip.generatedAt}</div>
                      {slip.generatedBy && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>by {slip.generatedBy}</div>
                      )}
                    </td>

                    {/* Delivery Record Column */}
                    <td>
                      {hasBeenDelivered ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          {emailSentAt && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(34,197,94,0.12)',
                                border: '1px solid rgba(34,197,94,0.3)',
                                color: '#16a34a',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                width: 'fit-content',
                              }}
                              title={`Emailed to ${slip.emailSentTo || slip.employee.email || 'employee'} (${slip.emailSendCount || 1} time${(slip.emailSendCount || 1) > 1 ? 's' : ''})`}
                            >
                              <Mail size={12} />
                              <span>Emailed: {emailSentAt}</span>
                            </div>
                          )}

                          {whatsappSentAt && (
                            <div
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: 'rgba(37,211,102,0.12)',
                                border: '1px solid rgba(37,211,102,0.3)',
                                color: '#25D366',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                width: 'fit-content',
                              }}
                              title={`WhatsApp sent to ${slip.whatsappSentTo || slip.employee.mobile || 'mobile'} (${slip.whatsappSendCount || 1} time${(slip.whatsappSendCount || 1) > 1 ? 's' : ''})`}
                            >
                              <MessageSquare size={12} />
                              <span>WhatsApp: {whatsappSentAt}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(245,158,11,0.1)',
                              border: '1px solid rgba(245,158,11,0.25)',
                              color: '#f59e0b',
                              fontSize: '0.75rem',
                              fontWeight: 500,
                            }}
                          >
                            <Clock size={11} /> Not Sent
                          </span>
                          {!slip.employee.email && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: '#ef4444',
                                background: 'rgba(239,68,68,0.1)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              No Email
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isSendingThis || bulkSending}
                          onClick={() => handleWhatsApp(slip)}
                          style={{
                            gap: '0.3rem',
                            borderColor: whatsappSentAt ? 'rgba(37,211,102,0.4)' : '#22c55e',
                            color: '#16a34a',
                            background: whatsappSentAt ? 'rgba(37,211,102,0.08)' : undefined,
                          }}
                          title={
                            whatsappSentAt
                              ? `Dispatched via WhatsApp on ${whatsappSentAt}. Click to re-send.`
                              : `Send salary slip via WhatsApp to ${slip.employee.name}`
                          }
                        >
                          <MessageSquare size={14} style={{ color: '#22c55e' }} />
                          {whatsappSentAt ? '✓ WhatsApp' : 'WhatsApp'}
                        </button>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={isSendingThis || bulkSending || !slip.employee.email}
                          onClick={() => handleSendSingleEmail(slip.payrollId, slip.employee.name)}
                          style={{
                            gap: '0.3rem',
                            borderColor: emailSentAt ? 'rgba(2,132,199,0.4)' : undefined,
                            color: emailSentAt ? '#0284c7' : undefined,
                            background: emailSentAt ? 'rgba(2,132,199,0.08)' : undefined,
                          }}
                          title={
                            !slip.employee.email
                              ? 'Employee has no email address'
                              : emailSentAt
                              ? `Emailed on ${emailSentAt}. Click to re-send.`
                              : `Email salary slip to ${slip.employee.email}`
                          }
                        >
                          <Mail size={14} style={{ color: '#0284c7' }} />
                          {isSendingThis ? 'Sending...' : emailSentAt ? '✓ Emailed' : 'Email'}
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
