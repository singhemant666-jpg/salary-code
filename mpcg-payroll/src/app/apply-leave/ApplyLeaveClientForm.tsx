'use client';

import { useState } from 'react';
import { applyEmployeeLeave, sendLeaveWhatsAppOTP, verifyLeaveWhatsAppOTP } from '@/actions/leaves';

interface EmployeeOption {
  id: string;
  name: string;
  employeeId: string;
  mobile: string | null;
  department: string | null;
  designation: string | null;
  suddenLeavePenalty: boolean;
}

export default function ApplyLeaveClientForm({ employees }: { employees: EmployeeOption[] }) {
  const [step, setStep] = useState<'FORM' | 'CONFIRMATION' | 'SUCCESS'>('FORM');

  const [identifierInput, setIdentifierInput] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDayType, setHalfDayType] = useState('FIRST_HALF');
  const [halfDayTime, setHalfDayTime] = useState('09:00 AM - 01:30 PM');
  const [reason, setReason] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);
  const [submittedSummary, setSubmittedSummary] = useState<any>(null);

  // WhatsApp OTP Verification States
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState<{ success: boolean; text: string } | null>(null);

  // Auto-match & auto-select employee profile by Contact Mobile Number or Employee ID
  const matchedEmp = employees.find(e => {
    if (!identifierInput.trim()) return false;
    const cleanInput = identifierInput.trim().toLowerCase();
    const inputDigits = cleanInput.replace(/\D/g, '');
    const empMobileDigits = (e.mobile || '').replace(/\D/g, '');

    if (inputDigits.length >= 4 && empMobileDigits.length >= 4) {
      if (inputDigits.length >= 10 && empMobileDigits.endsWith(inputDigits)) return true;
      if (empMobileDigits === inputDigits) return true;
    }
    if (e.employeeId.toLowerCase() === cleanInput) return true;
    return false;
  });

  const handleHalfDayTypeChange = (type: string) => {
    setHalfDayType(type);
    if (type === 'FIRST_HALF') {
      setHalfDayTime('09:00 AM - 01:30 PM');
    } else if (type === 'SECOND_HALF') {
      setHalfDayTime('01:30 PM - 06:00 PM');
    } else {
      setHalfDayTime('');
    }
  };

  const calculateDays = () => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return isHalfDay ? days * 0.5 : days;
  };

  // WhatsApp OTP Verification Handlers
  const handleSendOTP = async () => {
    if (!matchedEmp) return;
    const targetMobile = matchedEmp.mobile || identifierInput;
    if (!targetMobile || targetMobile.trim().length < 10) {
      setOtpMsg({ success: false, text: 'No valid 10-digit mobile number found on profile for WhatsApp OTP.' });
      return;
    }

    setOtpLoading(true);
    setOtpMsg(null);
    const res = await sendLeaveWhatsAppOTP(matchedEmp.id, targetMobile);
    setOtpLoading(false);

    if (res.success) {
      setOtpSent(true);
      setOtpMsg({ success: true, text: res.message });
      if (res.demoOtp) {
        setOtpInput(res.demoOtp);
      }
    } else {
      setOtpMsg({ success: false, text: res.message });
    }
  };

  const handleVerifyOTP = async () => {
    if (!matchedEmp || !otpInput.trim()) {
      setOtpMsg({ success: false, text: 'Please enter the 6-digit WhatsApp OTP code.' });
      return;
    }

    setOtpLoading(true);
    setOtpMsg(null);
    const targetMobile = matchedEmp.mobile || identifierInput;
    const res = await verifyLeaveWhatsAppOTP(targetMobile, otpInput.trim());
    setOtpLoading(false);

    if (res.success) {
      setIsOtpVerified(true);
      setOtpMsg({ success: true, text: '✅ WhatsApp OTP verified successfully!' });
    } else {
      setOtpMsg({ success: false, text: res.message });
    }
  };

  // Step 1 -> Move to Confirmation Review Screen
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedEmp) {
      setStatusMsg({ success: false, text: 'Please enter your registered contact mobile number or Employee ID to fetch your profile.' });
      return;
    }

    if (!isOtpVerified) {
      setStatusMsg({ success: false, text: 'Please send and verify the WhatsApp OTP sent to your registered profile mobile number before proceeding.' });
      return;
    }

    if (!fromDate || !toDate) {
      setStatusMsg({ success: false, text: 'Please select From Date and To Date.' });
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      setStatusMsg({ success: false, text: 'To Date cannot be earlier than From Date.' });
      return;
    }

    if (!reason.trim()) {
      setStatusMsg({ success: false, text: 'Please enter your formal leave letter / reason.' });
      return;
    }

    setStatusMsg(null);
    setStep('CONFIRMATION');
  };

  // Step 2 -> Final Submit Action
  const handleFinalSubmit = async () => {
    if (!matchedEmp) return;

    setSubmitting(true);
    setStatusMsg(null);

    const formData = new FormData();
    formData.append('employeeId', matchedEmp.id);
    formData.append('mobileNumber', matchedEmp.mobile || identifierInput);
    formData.append('fromDate', fromDate);
    formData.append('toDate', toDate);
    formData.append('leaveType', 'UNPAID_LEAVE');
    formData.append('isHalfDay', String(isHalfDay));
    formData.append('halfDayType', halfDayType);
    formData.append('halfDayTime', halfDayTime);
    formData.append('reason', reason);

    const res = await applyEmployeeLeave(formData);
    setSubmitting(false);

    if (res.success) {
      setSubmittedSummary({
        empName: matchedEmp.name,
        empId: matchedEmp.employeeId,
        dept: matchedEmp.department,
        mobile: matchedEmp.mobile || identifierInput,
        fromDate,
        toDate,
        totalDays: calculateDays(),
        isHalfDay,
        halfDayTime: isHalfDay ? halfDayTime : null,
        reason,
        appliedAt: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      });
      setStep('SUCCESS');
    } else {
      setStatusMsg({ success: false, text: res.message });
      setStep('FORM');
    }
  };

  const handleResetForm = () => {
    setIdentifierInput('');
    setFromDate('');
    setToDate('');
    setIsHalfDay(false);
    setHalfDayType('FIRST_HALF');
    setHalfDayTime('09:00 AM - 01:30 PM');
    setReason('');
    setStatusMsg(null);
    setSubmittedSummary(null);
    setIsOtpVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setOtpMsg(null);
    setStep('FORM');
  };

  // ==========================================
  // RENDER: STEP 3 - THANK YOU SUCCESS SCREEN
  // ==========================================
  if (step === 'SUCCESS') {
    return (
      <div style={{ textTransform: 'none' }}>
        <div style={{
          textAlign: 'center',
          padding: '2rem 1.25rem',
          background: '#f8fafc',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
        }}>
          {/* Success Checkmark Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto 1rem auto',
            borderRadius: '50%',
            background: '#dcfce7',
            border: '1px solid #86efac',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            color: '#16a34a'
          }}>
            ✓
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
            Thank You, {submittedSummary?.empName}!
          </h2>
          <p style={{ color: '#16a34a', fontSize: '0.95rem', fontWeight: 600, margin: '0 0 1.25rem 0' }}>
            🎉 Your Leave Application Has Been Submitted Successfully.
          </p>
          <p style={{ color: '#64748b', fontSize: '0.85rem', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: '1.6' }}>
            Your request has been routed directly to HR for Review & Approval. If approved, this will automatically record as an official Leave with Letter without any double salary penalty.
          </p>

          {/* Submission Receipt Summary Box */}
          <div style={{
            textAlign: 'left',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '1.15rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'grid',
            gap: '0.75rem',
            fontSize: '0.875rem'
          }}>
            <div style={{ borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Application Status:</span>
              <span style={{ color: '#854d0e', fontWeight: 700, background: '#fef9c3', border: '1px solid #fef08a', padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', letterSpacing: '0.03em' }}>
                ⏳ PENDING HR APPROVAL
              </span>
            </div>

            <div className="responsive-summary-grid">
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>EMPLOYEE</span>
                <strong style={{ color: '#0f172a' }}>{submittedSummary?.empName}</strong>
                <span style={{ color: '#475569', fontSize: '0.8rem' }}> ({submittedSummary?.empId})</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>CONTACT</span>
                <strong style={{ color: '#0f172a' }}>{submittedSummary?.mobile}</strong>
              </div>
            </div>

            <div className="responsive-summary-grid">
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>LEAVE CATEGORY</span>
                <strong style={{ color: '#4f46e5' }}>Unpaid Leave (Letter Submitted)</strong>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>DURATION</span>
                <strong style={{ color: '#0f172a' }}>{submittedSummary?.totalDays} Day(s)</strong>
                {submittedSummary?.isHalfDay && <span style={{ color: '#475569', fontSize: '0.8rem' }}> (Half Day)</span>}
              </div>
            </div>

            <div className="responsive-summary-grid">
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>FROM DATE</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{submittedSummary?.fromDate}</span>
              </div>
              <div>
                <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>TO DATE</span>
                <span style={{ color: '#0f172a', fontWeight: 600 }}>{submittedSummary?.toDate}</span>
              </div>
            </div>

            <div>
              <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>SUBMITTED LETTER / REASON</span>
              <div style={{ color: '#334155', background: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '6px', marginTop: '0.25rem', fontStyle: 'italic', fontSize: '0.85rem', lineHeight: '1.5', border: '1px solid #e2e8f0' }}>
                "{submittedSummary?.reason}"
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }


  // ===============================================
  // RENDER: STEP 2 - CONFIRMATION & SUMMARY REVIEW
  // ===============================================
  if (step === 'CONFIRMATION') {
    return (
      <div style={{ display: 'grid', gap: '1.25rem' }}>
        <div style={{
          padding: '1rem 1.15rem',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '10px',
          color: '#1e40af'
        }}>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1e3a8a', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>🔍</span> Review & Confirm Application Summary
          </div>
          <p style={{ fontSize: '0.8rem', color: '#3b82f6', margin: 0, lineHeight: '1.4' }}>
            Please verify all details below before giving your final confirmation.
          </p>
        </div>

        {/* Detailed Application Summary Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.15rem 1.25rem',
          display: 'grid',
          gap: '0.85rem'
        }}>
          <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>Verified Employee Profile</span>
              <strong style={{ fontSize: '1.05rem', color: '#0f172a' }}>👤 {matchedEmp?.name}</strong>
              <span style={{ color: '#16a34a', marginLeft: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}>({matchedEmp?.employeeId})</span>
            </div>
            {matchedEmp?.department && (
              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.25rem 0.6rem', borderRadius: '20px', color: '#475569', fontWeight: 600 }}>
                {matchedEmp.department}
              </span>
            )}
          </div>

          <div className="responsive-summary-grid">
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>CONTACT MOBILE</span>
              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>📱 {matchedEmp?.mobile || identifierInput}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>LEAVE CATEGORY</span>
              <strong style={{ color: '#4f46e5', fontSize: '0.9rem' }}>📌 Unpaid Leave (Letter Submitted)</strong>
            </div>
          </div>

          <div className="responsive-summary-grid" style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>FROM DATE</span>
              <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>📅 {fromDate}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>TO DATE</span>
              <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>📅 {toDate}</strong>
            </div>
          </div>

          <div className="responsive-summary-grid">
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>LEAVE DURATION</span>
              <strong style={{ color: '#0284c7', fontSize: '0.95rem' }}>
                ⏱️ {calculateDays()} {isHalfDay ? 'Half Day(s)' : 'Full Day(s)'}
              </strong>
            </div>
            {isHalfDay && (
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.15rem' }}>HALF DAY SHIFT / TIME</span>
                <strong style={{ color: '#d97706', fontSize: '0.8rem' }}>
                  {halfDayType === 'FIRST_HALF' ? 'First Half (Morning)' : halfDayType === 'SECOND_HALF' ? 'Second Half (Evening)' : 'Custom Range'} ({halfDayTime})
                </strong>
              </div>
            )}
          </div>

          <div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>WRITTEN LEAVE LETTER / REASON</span>
            <div style={{
              background: '#f8fafc',
              padding: '0.75rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              color: '#334155',
              fontSize: '0.85rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              "{reason}"
            </div>
          </div>
        </div>

        {/* Confirmation Buttons Grid */}
        <div className="responsive-btn-grid">
          <button
            type="button"
            onClick={() => setStep('FORM')}
            disabled={submitting}
            style={{
              padding: '0.85rem 1rem',
              background: '#f1f5f9',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.9rem',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            ✏️ Edit Details / Go Back
          </button>

          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={submitting}
            style={{
              padding: '0.85rem 1.25rem',
              background: '#16a34a',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              borderRadius: '8px',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              transition: 'all 0.2s ease',
              opacity: submitting ? 0.7 : 1
            }}
          >
            {submitting ? 'Submitting Application...' : '✅ Confirm & Submit Application'}
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: STEP 1 - INITIAL FORM INPUT SCREEN
  // ==========================================
  return (
    <form onSubmit={handleProceedToReview} style={{ display: 'grid', gap: '1.15rem' }}>
      {statusMsg && (
        <div style={{
          padding: '0.85rem 1rem',
          borderRadius: '8px',
          background: statusMsg.success ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${statusMsg.success ? '#bbf7d0' : '#fecaca'}`,
          color: statusMsg.success ? '#15803d' : '#b91c1c',
          fontSize: '0.85rem',
          lineHeight: '1.5'
        }}>
          {statusMsg.success ? '✅ ' : '❌ '} {statusMsg.text}
        </div>
      )}

      {/* Contact Mobile Number Input */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1e293b' }}>
          Contact Mobile Number *
        </label>
        <input
          type="text"
          placeholder="Enter registered mobile number (e.g. 9876543210) or Emp ID..."
          value={identifierInput}
          onChange={(e) => {
            setIdentifierInput(e.target.value);
            if (statusMsg) setStatusMsg(null);
          }}
          required
          style={{
            width: '100%',
            padding: '0.75rem 0.95rem',
            background: '#ffffff',
            border: matchedEmp ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
            borderRadius: '8px',
            color: '#0f172a',
            fontSize: '16px', // 16px prevents mobile browser auto-zoom
            outline: 'none',
            boxShadow: matchedEmp ? '0 0 0 3px rgba(22, 163, 74, 0.12)' : 'none',
            transition: 'all 0.2s ease'
          }}
        />

        {/* Fetched Employee Profile Card */}
        {matchedEmp ? (
          <div>
            <div style={{
              marginTop: '0.55rem',
              padding: '0.75rem 0.95rem',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              fontSize: '0.85rem',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#15803d', fontWeight: 700, marginBottom: '0.1rem' }}>
                  ✓ Profile Auto-Selected from Database
                </div>
                <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>👤 {matchedEmp.name}</strong>
                <span style={{ color: '#475569', marginLeft: '0.35rem' }}>({matchedEmp.employeeId})</span>
                {matchedEmp.department && <span style={{ color: '#64748b' }}> · {matchedEmp.department}</span>}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#15803d', background: '#ffffff', border: '1px solid #dcfce7', padding: '0.25rem 0.5rem', borderRadius: '6px', fontWeight: 600 }}>
                Policy: {matchedEmp.suddenLeavePenalty ? '⚠️ 2x Cut if unapproved' : '✓ 1x Normal Cut'}
              </div>
            </div>

            {/* WhatsApp OTP Verification Box */}
            <div style={{
              marginTop: '0.65rem',
              padding: '0.85rem 1rem',
              background: isOtpVerified ? '#f0fdf4' : '#faf5ff',
              border: isOtpVerified ? '1.5px solid #22c55e' : '1.5px solid #d8b4fe',
              borderRadius: '8px',
              display: 'grid',
              gap: '0.6rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>💬</span>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: isOtpVerified ? '#15803d' : '#7e22ce', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                      WhatsApp OTP Verification
                    </span>
                    <div style={{ fontSize: '0.825rem', color: '#0f172a', fontWeight: 600 }}>
                      {matchedEmp.mobile ? `📱 Profile WhatsApp: +91 ${matchedEmp.mobile.replace(/\D/g, '').slice(-10)}` : '📱 Registered Profile Number'}
                    </div>
                  </div>
                </div>

                {isOtpVerified ? (
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#dcfce7',
                    color: '#15803d',
                    border: '1px solid #86efac',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '20px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    ✓ Mobile Verified via WhatsApp
                  </span>
                ) : (
                  <span style={{ fontSize: '0.725rem', color: '#9333ea', fontWeight: 600, background: '#f3e8ff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    OTP Verification Required
                  </span>
                )}
              </div>

              {/* OTP Actions Panel */}
              {!isOtpVerified && (
                <div style={{ display: 'grid', gap: '0.5rem', paddingTop: '0.4rem', borderTop: '1px dashed #d8b4fe' }}>
                  {!otpSent ? (
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={otpLoading}
                      style={{
                        padding: '0.65rem 1rem',
                        background: '#9333ea',
                        color: '#ffffff',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        border: 'none',
                        cursor: otpLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        boxShadow: '0 2px 8px rgba(147, 51, 234, 0.2)'
                      }}
                    >
                      {otpLoading ? 'Sending WhatsApp OTP...' : '📲 Send WhatsApp OTP to Profile Number'}
                    </button>
                  ) : (
                    <div style={{ display: 'grid', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit OTP"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                          style={{
                            flex: 1,
                            padding: '0.6rem 0.85rem',
                            background: '#ffffff',
                            border: '1.5px solid #a855f7',
                            borderRadius: '6px',
                            color: '#0f172a',
                            fontSize: '16px',
                            fontWeight: 700,
                            letterSpacing: '0.15em',
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOTP}
                          disabled={otpLoading || otpInput.length < 6}
                          style={{
                            padding: '0.6rem 1.1rem',
                            background: otpInput.length >= 6 ? '#16a34a' : '#cbd5e1',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            borderRadius: '6px',
                            border: 'none',
                            cursor: (otpLoading || otpInput.length < 6) ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {otpLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                        <span style={{ color: '#64748b' }}>Didn't get the WhatsApp message?</span>
                        <button
                          type="button"
                          onClick={handleSendOTP}
                          disabled={otpLoading}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#7e22ce',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            padding: 0
                          }}
                        >
                          Resend WhatsApp OTP
                        </button>
                      </div>
                    </div>
                  )}

                  {otpMsg && (
                    <div style={{
                      fontSize: '0.78rem',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '5px',
                      background: otpMsg.success ? '#f0fdf4' : '#fef2f2',
                      border: `1px solid ${otpMsg.success ? '#bbf7d0' : '#fecaca'}`,
                      color: otpMsg.success ? '#15803d' : '#b91c1c'
                    }}>
                      {otpMsg.text}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : identifierInput.trim() ? (
          <div style={{ marginTop: '0.35rem', fontSize: '0.78rem', color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span>⚠️ Profile not found.</span>
            <span>Please enter your registered 10-digit mobile number or Employee ID.</span>
          </div>
        ) : (
          <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
            Type your mobile number or Employee ID to auto-fetch your profile.
          </span>
        )}
      </div>

      {/* Auto-Selected Leave Category Pill */}
      <div style={{
        padding: '0.75rem 0.95rem',
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.4rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1rem' }}>📌</span>
          <div>
            <span style={{ fontSize: '0.7rem', color: '#0369a1', display: 'block', fontWeight: 700, letterSpacing: '0.04em' }}>
              LEAVE CATEGORY (AUTO-SELECTED)
            </span>
            <span style={{ fontSize: '0.875rem', color: '#0f172a', fontWeight: 700 }}>
              Unpaid Leave (Letter Submitted)
            </span>
          </div>
        </div>
        <span style={{ fontSize: '0.7rem', color: '#0369a1', background: '#e0f2fe', padding: '0.2rem 0.55rem', borderRadius: '20px', fontWeight: 600 }}>
          Default Category
        </span>
      </div>

      {/* Responsive Date Range Grid */}
      <div className="responsive-date-grid">
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1e293b' }}>
            From Date *
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem 0.85rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1e293b' }}>
            To Date *
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '0.75rem 0.85rem',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              color: '#0f172a',
              fontSize: '16px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Half Day Option */}
      <div style={{
        padding: '0.85rem 0.95rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px'
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isHalfDay}
            onChange={(e) => setIsHalfDay(e.target.checked)}
            style={{ width: '1.1rem', height: '1.1rem', accentColor: '#4f46e5' }}
          />
          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
            Is this a Half Day Leave?
          </span>
        </label>

        {isHalfDay && (
          <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.65rem', paddingTop: '0.65rem', borderTop: '1px dashed #cbd5e1' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.3rem', color: '#64748b' }}>
                Half Day Shift Session
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleHalfDayTypeChange('FIRST_HALF')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: halfDayType === 'FIRST_HALF' ? '#4f46e5' : '#ffffff',
                    color: halfDayType === 'FIRST_HALF' ? '#ffffff' : '#475569',
                    border: halfDayType === 'FIRST_HALF' ? '1px solid #4f46e5' : '1px solid #cbd5e1'
                  }}
                >
                  First Half (Morning)
                </button>
                <button
                  type="button"
                  onClick={() => handleHalfDayTypeChange('SECOND_HALF')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: halfDayType === 'SECOND_HALF' ? '#4f46e5' : '#ffffff',
                    color: halfDayType === 'SECOND_HALF' ? '#ffffff' : '#475569',
                    border: halfDayType === 'SECOND_HALF' ? '1px solid #4f46e5' : '1px solid #cbd5e1'
                  }}
                >
                  Second Half (Evening)
                </button>
                <button
                  type="button"
                  onClick={() => handleHalfDayTypeChange('SPECIFIC_TIME')}
                  style={{
                    padding: '0.4rem 0.65rem',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: halfDayType === 'SPECIFIC_TIME' ? '#4f46e5' : '#ffffff',
                    color: halfDayType === 'SPECIFIC_TIME' ? '#ffffff' : '#475569',
                    border: halfDayType === 'SPECIFIC_TIME' ? '1px solid #4f46e5' : '1px solid #cbd5e1'
                  }}
                >
                  Specific Time Range
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.25rem', color: '#64748b' }}>
                Half Day Timing / Hours
              </label>
              <input
                type="text"
                placeholder="e.g. 09:00 AM - 01:30 PM"
                value={halfDayTime}
                onChange={(e) => setHalfDayTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#0f172a',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Written Letter Reason */}
      <div>
        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: '#1e293b' }}>
          Leave Letter / Reason & Explanation *
        </label>
        <textarea
          rows={4}
          placeholder="Type your formal leave letter / reason here (e.g. Personal work, family function, medical appointment...)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
          style={{
            width: '100%',
            padding: '0.75rem 0.95rem',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            color: '#0f172a',
            fontSize: '16px',
            outline: 'none',
            resize: 'vertical',
            lineHeight: '1.5'
          }}
        />
        <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem', display: 'block' }}>
          💡 When approved by Admin, this counts as an official <strong>Leave With Letter</strong>. Double salary deduction penalty will NOT apply.
        </span>
      </div>

      {/* Proceed to Review Button */}
      <button
        type="submit"
        disabled={!matchedEmp || !isOtpVerified}
        style={{
          width: '100%',
          padding: '0.875rem 1.5rem',
          background: (matchedEmp && isOtpVerified) ? '#4f46e5' : '#94a3b8',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.95rem',
          borderRadius: '8px',
          border: 'none',
          cursor: (!matchedEmp || !isOtpVerified) ? 'not-allowed' : 'pointer',
          boxShadow: (matchedEmp && isOtpVerified) ? '0 4px 12px rgba(79, 70, 229, 0.25)' : 'none',
          transition: 'all 0.2s ease',
          opacity: (!matchedEmp || !isOtpVerified) ? 0.7 : 1
        }}
      >
        {!matchedEmp
          ? 'Enter Mobile Number to Fetch Profile'
          : !isOtpVerified
          ? '🔒 Verify WhatsApp OTP to Proceed'
          : '🔍 Review Summary & Submit Leave'}
      </button>
    </form>
  );
}




