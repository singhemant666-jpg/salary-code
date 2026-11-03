'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  updateLeaveStatus,
  sendLeaveApprovalOTP,
  getLeaveApprovalOtpPhone,
  updateLeaveApprovalOtpPhone,
  checkLeaveClashes,
} from '@/actions/leaves';
import {
  Check,
  X,
  Calendar,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Phone,
  Edit2,
  RefreshCw,
  Send,
  Lock,
} from 'lucide-react';

export interface ClashingLeaveInfo {
  id: string;
  employeeName: string;
  employeeId: string;
  department?: string | null;
  status: string;
  fromDateStr: string;
  toDateStr: string;
  isSameDepartment?: boolean;
}

interface ApproveLeaveModalProps {
  leave: {
    id: string;
    employeeName: string;
    employeeId: string;
    department?: string | null;
    fromDateStr: string;
    toDateStr: string;
    fromDateRaw: string; // YYYY-MM-DD
    toDateRaw: string;   // YYYY-MM-DD
    leaveType: string;
    clashes?: ClashingLeaveInfo[];
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ApproveLeaveModal({
  leave,
  isOpen,
  onClose,
  onSuccess,
}: ApproveLeaveModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [approvalMode, setApprovalMode] = useState<'FULL' | 'CUSTOM'>('FULL');

  const [approvedFromDate, setApprovedFromDate] = useState(leave.fromDateRaw);
  const [approvedToDate, setApprovedToDate] = useState(leave.toDateRaw);

  // Clash Detection State
  const [clashes, setClashes] = useState<ClashingLeaveInfo[]>(leave.clashes || []);
  const [checkingClashes, setCheckingClashes] = useState(false);

  // OTP Verification State
  const [approverPhone, setApproverPhone] = useState('9967904923');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('9967904923');
  const [savingPhone, setSavingPhone] = useState(false);

  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch configured approval phone number & reset fields when modal opens
  useEffect(() => {
    if (isOpen) {
      setApprovalMode('FULL');
      setApprovedFromDate(leave.fromDateRaw);
      setApprovedToDate(leave.toDateRaw);
      setOtp('');
      setOtpSent(false);
      setOtpMessage('');
      setDemoOtp('');
      setCountdown(0);
      setIsEditingPhone(false);

      getLeaveApprovalOtpPhone().then((p) => {
        setApproverPhone(p);
        setPhoneInput(p);
      });

      // Fetch fresh clashes for applied dates
      setCheckingClashes(true);
      checkLeaveClashes(leave.id, leave.fromDateRaw, leave.toDateRaw).then((res) => {
        setClashes(res);
        setCheckingClashes(false);
      });
    }
  }, [isOpen, leave.id, leave.fromDateRaw, leave.toDateRaw]);

  // When custom dates change, re-check clashes
  useEffect(() => {
    if (!isOpen) return;
    const from = approvalMode === 'CUSTOM' ? approvedFromDate : leave.fromDateRaw;
    const to = approvalMode === 'CUSTOM' ? approvedToDate : leave.toDateRaw;
    if (from && to && from <= to) {
      checkLeaveClashes(leave.id, from, to).then((res) => {
        setClashes(res);
      });
    }
  }, [isOpen, approvalMode, approvedFromDate, approvedToDate, leave.id, leave.fromDateRaw, leave.toDateRaw]);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Applied Days Calculation
  const startApplied = new Date(leave.fromDateRaw);
  const endApplied = new Date(leave.toDateRaw);
  const totalAppliedDays = Math.max(1, Math.round((endApplied.getTime() - startApplied.getTime()) / (1000 * 3600 * 24)) + 1);

  // Approved Days Calculation
  const startApproved = new Date(approvedFromDate);
  const endApproved = new Date(approvedToDate);
  const totalApprovedDays = Math.max(1, Math.round((endApproved.getTime() - startApproved.getTime()) / (1000 * 3600 * 24)) + 1);
  const remainingDays = Math.max(0, totalAppliedDays - totalApprovedDays);

  // Handle Saving Updated Phone Number
  const handleSavePhone = async () => {
    const clean = phoneInput.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }
    setSavingPhone(true);
    const res = await updateLeaveApprovalOtpPhone(clean);
    setSavingPhone(false);
    if (res.success) {
      setApproverPhone(clean);
      setIsEditingPhone(false);
      alert(res.message);
    } else {
      alert(res.message);
    }
  };

  // Handle Sending Approval OTP
  const handleSendOTP = async () => {
    setOtpLoading(true);
    setOtpMessage('');
    setDemoOtp('');
    try {
      const res = await sendLeaveApprovalOTP(leave.id);
      setOtpLoading(false);
      setOtpSent(true);
      setOtpMessage(res.message);
      if (res.demoOtp) {
        setDemoOtp(res.demoOtp);
      }
      setCountdown(60); // 60s cooldown
    } catch (err: any) {
      setOtpLoading(false);
      setOtpMessage(err.message || 'Failed to send OTP');
    }
  };

  // Handle Final Confirmation with OTP
  const handleConfirm = async () => {
    if (!otpSent) {
      alert('Please click "Send WhatsApp OTP" first to receive your verification code.');
      return;
    }

    if (!otp.trim() || otp.trim().length < 6) {
      alert('Please enter the 6-digit OTP code sent to +' + approverPhone);
      return;
    }

    setLoading(true);
    let fromVal: string | undefined;
    let toVal: string | undefined;

    if (approvalMode === 'CUSTOM') {
      fromVal = approvedFromDate;
      toVal = approvedToDate;
    }

    const res = await updateLeaveStatus(
      leave.id,
      'APPROVED',
      fromVal,
      toVal,
      undefined,
      otp.trim()
    );
    setLoading(false);

    if (res.success) {
      if (res.whatsappUrl && !res.whatsappSent) {
        if (confirm('Leave application approved! Open WhatsApp to send confirmation to the employee?')) {
          window.open(res.whatsappUrl, '_blank');
        }
      } else {
        alert(res.message);
      }
      onClose();
      onSuccess();
    } else {
      alert(res.message);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          backgroundColor: 'var(--bg-modal)',
          color: 'var(--text-on-modal)',
          border: '1px solid var(--modal-border)',
          borderRadius: '16px',
          boxShadow: 'var(--modal-shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1.15rem 1.4rem',
          borderBottom: '1px solid var(--border-primary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-modal-header)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#4ade80',
              padding: '0.45rem',
              borderRadius: '8px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
            }}>
              <Check size={20} />
            </span>
            <div>
              <h3 style={{ fontSize: '1.12rem', fontWeight: 800, color: 'var(--text-on-modal)', margin: 0 }}>
                Approve Leave Application
              </h3>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-label-muted)' }}>
                {leave.employeeName} ({leave.employeeId}) {leave.department ? `· ${leave.department}` : ''}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              padding: '0.4rem',
              color: 'var(--text-label-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '1.25rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
          
          {/* Clash Alert Box (Prominently displayed if same-day leaves exist) */}
          {clashes.length > 0 && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1.5px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '12px',
                padding: '0.9rem 1.1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                animation: 'fade-in 0.2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f87171', fontWeight: 800, fontSize: '0.92rem' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <span>⚠️ Date Clash Alert: {clashes.length + 1} Employees on Leave on Same Day!</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#fecaca', lineHeight: 1.4 }}>
                The following employee(s) already have pending or approved leave during this same date period:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.2rem' }}>
                {clashes.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      background: 'rgba(0, 0, 0, 0.25)',
                      padding: '0.4rem 0.7rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.4rem',
                      border: c.isSameDepartment ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <div>
                      <strong style={{ color: '#ffffff' }}>{c.employeeName}</strong>
                      <span style={{ color: '#cbd5e1', marginLeft: '6px' }}>
                        ({c.department || 'Staff'})
                      </span>
                      {c.isSameDepartment && (
                        <span style={{
                          background: 'rgba(244, 63, 94, 0.25)',
                          color: '#fda4af',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          marginLeft: '6px',
                        }}>
                          Same Dept
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#fca5a5', fontWeight: 600 }}>
                      📅 {c.fromDateStr} {c.fromDateStr !== c.toDateStr ? `to ${c.toDateStr}` : ''}
                      <span style={{
                        marginLeft: '6px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        fontSize: '0.68rem',
                        background: c.status === 'APPROVED' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                        color: c.status === 'APPROVED' ? '#4ade80' : '#facc15',
                      }}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Applied Period Summary Box */}
          <div style={{
            background: 'var(--bg-modal-header)',
            border: '1px solid var(--border-primary)',
            borderRadius: '10px',
            padding: '0.85rem 1.15rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-label-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                APPLIED LEAVE DURATION
              </span>
              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-on-modal)', marginTop: '2px' }}>
                📅 {leave.fromDateStr} {leave.fromDateStr !== leave.toDateStr ? `to ${leave.toDateStr}` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-label-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                TOTAL DAYS
              </span>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#fbbf24' }}>
                {totalAppliedDays} {totalAppliedDays === 1 ? 'Day' : 'Days'}
              </div>
            </div>
          </div>

          {/* Mode Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-label-accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Approval Duration Options
            </label>

            {/* Option 1: Full Range */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: approvalMode === 'FULL' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${approvalMode === 'FULL' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="radio"
                name="approvalMode"
                value="FULL"
                checked={approvalMode === 'FULL'}
                onChange={() => setApprovalMode('FULL')}
                style={{ accentColor: '#22c55e', width: '16px', height: '16px' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-on-modal)' }}>
                  Approve Full Applied Period ({totalAppliedDays} Days)
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-label-muted)' }}>
                  Approve from {leave.fromDateStr} to {leave.toDateStr}
                </span>
              </div>
            </label>

            {/* Option 2: Custom / Partial Days */}
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                background: approvalMode === 'CUSTOM' ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${approvalMode === 'CUSTOM' ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                type="radio"
                name="approvalMode"
                value="CUSTOM"
                checked={approvalMode === 'CUSTOM'}
                onChange={() => setApprovalMode('CUSTOM')}
                style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.88rem', color: 'var(--text-on-modal)' }}>
                  Approve Custom Days / Partial Range
                </strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-label-muted)' }}>
                  Approve fewer days (e.g. 2 or 3 days out of {totalAppliedDays} days)
                </span>
              </div>
            </label>
          </div>

          {/* Custom Date Controls */}
          {approvalMode === 'CUSTOM' && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '12px',
              padding: '0.9rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-label-muted)', marginBottom: '0.3rem' }}>
                    APPROVED FROM DATE
                  </label>
                  <input
                    type="date"
                    value={approvedFromDate}
                    min={leave.fromDateRaw}
                    max={approvedToDate || leave.toDateRaw}
                    onChange={(e) => setApprovedFromDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-input)',
                      color: 'var(--text-on-modal)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-label-muted)', marginBottom: '0.3rem' }}>
                    APPROVED TO DATE
                  </label>
                  <input
                    type="date"
                    value={approvedToDate}
                    min={approvedFromDate || leave.fromDateRaw}
                    max={leave.toDateRaw}
                    onChange={(e) => setApprovedToDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.65rem',
                      borderRadius: '8px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-input)',
                      color: 'var(--text-on-modal)',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.55rem 0.8rem',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                borderRadius: '8px',
                fontSize: '0.82rem',
              }}>
                <span style={{ color: '#4ade80', fontWeight: 600 }}>Approved Duration:</span>
                <span style={{ color: 'var(--text-on-modal)', fontWeight: 800 }}>
                  {totalApprovedDays} {totalApprovedDays === 1 ? 'Day' : 'Days'} Approved
                </span>
              </div>

              {remainingDays > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#facc15', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlertCircle size={13} />
                  <span>
                    Remaining {remainingDays} {remainingDays === 1 ? 'day' : 'days'} will stay unapproved / calculated as Loss of Pay (LOP).
                  </span>
                </div>
              )}
            </div>
          )}

          {/* OTP Verification Section */}
          <div
            style={{
              background: 'rgba(6, 182, 212, 0.05)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <ShieldCheck size={18} style={{ color: '#06b6d4' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Approver OTP Verification
                </span>
              </div>

              {/* Configured Approver Phone Number Display & Edit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Phone size={13} style={{ color: '#06b6d4' }} />
                {!isEditingPhone ? (
                  <>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#06b6d4' }}>
                      +91 {approverPhone}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingPhone(true)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Change approver phone number"
                    >
                      <Edit2 size={13} />
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      placeholder="10-digit number"
                      style={{ width: '130px', height: '28px', fontSize: '0.78rem', padding: '2px 6px' }}
                      maxLength={10}
                    />
                    <button
                      type="button"
                      onClick={handleSavePhone}
                      disabled={savingPhone}
                      className="btn btn-primary btn-sm"
                      style={{ height: '28px', fontSize: '0.72rem', padding: '2px 8px' }}
                    >
                      {savingPhone ? '...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsEditingPhone(false); setPhoneInput(approverPhone); }}
                      className="btn btn-ghost btn-sm"
                      style={{ height: '28px', fontSize: '0.72rem', padding: '2px 6px' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
              A 6-digit WhatsApp OTP is sent to <strong>+91 {approverPhone}</strong> to securely authorize this leave approval.
            </p>

            {/* Send OTP button & Inputs */}
            {!otpSent ? (
              <button
                type="button"
                onClick={handleSendOTP}
                disabled={otpLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  height: '38px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  background: '#0891b2',
                }}
              >
                {otpLoading ? <RefreshCw size={15} className="animate-spin" /> : <Send size={15} />}
                {otpLoading ? 'Sending WhatsApp OTP...' : `Send WhatsApp OTP to +91 ${approverPhone}`}
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Lock size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      style={{
                        paddingLeft: '32px',
                        letterSpacing: '0.2em',
                        fontWeight: 700,
                        fontSize: '1rem',
                        textAlign: 'center',
                        height: '40px',
                      }}
                      maxLength={6}
                      autoFocus
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={countdown > 0 || otpLoading}
                    className="btn btn-secondary"
                    style={{
                      height: '40px',
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                      padding: '0 0.8rem',
                    }}
                  >
                    {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                  </button>
                </div>

                {otpMessage && (
                  <div style={{ fontSize: '0.74rem', color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={12} />
                    <span>{otpMessage}</span>
                  </div>
                )}

                {demoOtp && (
                  <div style={{
                    fontSize: '0.74rem',
                    background: 'rgba(234, 179, 8, 0.15)',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    color: '#facc15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <span>Testing Mode OTP: <strong>{demoOtp}</strong></span>
                    <button
                      type="button"
                      onClick={() => setOtp(demoOtp)}
                      style={{
                        background: '#facc15',
                        color: '#000000',
                        border: 'none',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Fill OTP
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          padding: '0.9rem 1.4rem',
          borderTop: '1px solid var(--border-primary)',
          background: 'var(--bg-modal-footer)',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem',
          flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.6rem 1.2rem',
              background: 'var(--btn-ghost-bg)',
              color: 'var(--btn-ghost-text)',
              fontWeight: 600,
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--btn-ghost-border)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              loading ||
              !otpSent ||
              otp.trim().length < 6 ||
              (approvalMode === 'CUSTOM' && totalApprovedDays <= 0)
            }
            style={{
              padding: '0.6rem 1.35rem',
              background: !otpSent || otp.trim().length < 6 ? '#64748b' : '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: 'none',
              cursor: loading || !otpSent || otp.trim().length < 6 ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: !otpSent || otp.trim().length < 6 ? 'none' : '0 4px 12px rgba(22, 163, 74, 0.3)',
            }}
          >
            <Check size={16} />
            {loading ? 'Approving...' : `Verify OTP & Approve (${approvalMode === 'FULL' ? totalAppliedDays : totalApprovedDays} Days)`}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
