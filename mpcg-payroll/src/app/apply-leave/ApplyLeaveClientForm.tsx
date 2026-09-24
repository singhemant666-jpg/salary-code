'use client';

import { useState } from 'react';
import { applyEmployeeLeave, sendLeaveWhatsAppOTP, verifyLeaveWhatsAppOTP } from '@/actions/leaves';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';

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
  const [halfDayType, setHalfDayType] = useState('FIRST_HALF'); // 'FIRST_HALF' | 'SECOND_HALF' | 'CUSTOM'
  const [halfDayTime, setHalfDayTime] = useState('09:00 AM - 01:30 PM');
  const [customStartTime, setCustomStartTime] = useState('10:00');
  const [customEndTime, setCustomEndTime] = useState('14:30');
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
  const matchedEmp = employees.find((e) => {
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

  const format12Hour = (time24: string) => {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const formattedH = h < 10 ? `0${h}` : `${h}`;
    return `${formattedH}:${mStr} ${ampm}`;
  };

  const handleHalfDayTypeChange = (type: string) => {
    setHalfDayType(type);
    if (type === 'FIRST_HALF') {
      setHalfDayTime('09:00 AM - 01:30 PM');
    } else if (type === 'SECOND_HALF') {
      setHalfDayTime('01:30 PM - 06:00 PM');
    } else if (type === 'CUSTOM') {
      const formatted = `${format12Hour(customStartTime)} - ${format12Hour(customEndTime)}`;
      setHalfDayTime(formatted);
    }
  };

  const updateCustomTime = (newStart: string, newEnd: string) => {
    setCustomStartTime(newStart);
    setCustomEndTime(newEnd);
    const formatted = `${format12Hour(newStart)} - ${format12Hour(newEnd)}`;
    setHalfDayTime(formatted);
  };

  const calculateDays = () => {
    if (!fromDate || !toDate) return 0;
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays <= 0) return 0;
    return isHalfDay ? 0.5 : diffDays;
  };

  const setQuickDate = (daysFromToday: number, durationDays: number = 1) => {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + daysFromToday);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (durationDays - 1));

    const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
    setFromDate(formatDateStr(startDate));
    setToDate(formatDateStr(endDate));
  };

  const handleQuickReason = (text: string) => {
    setReason((prev) => (prev ? `${prev}. ${text}` : text));
  };

  const handleSendOtp = async () => {
    if (!matchedEmp) {
      setStatusMsg({ success: false, text: 'Please select or enter your employee profile first.' });
      return;
    }
    const targetMobile = matchedEmp.mobile || identifierInput;
    if (!targetMobile || targetMobile.trim().length < 10) {
      setOtpMsg({ success: false, text: 'Mobile number not found on employee profile.' });
      return;
    }

    setOtpLoading(true);
    setOtpMsg(null);
    const res = await sendLeaveWhatsAppOTP(matchedEmp.id, targetMobile);
    setOtpLoading(false);

    if (res.success) {
      setOtpSent(true);
      setOtpMsg({ success: true, text: res.message });
    } else {
      setOtpMsg({ success: false, text: res.message });
    }
  };

  const handleVerifyOtp = async () => {
    if (!matchedEmp || !otpInput.trim()) return;

    setOtpLoading(true);
    setOtpMsg(null);
    const res = await verifyLeaveWhatsAppOTP(matchedEmp.id, otpInput.trim());
    setOtpLoading(false);

    if (res.success) {
      setIsOtpVerified(true);
      setOtpMsg({ success: true, text: 'Identity verified successfully.' });
    } else {
      setOtpMsg({ success: false, text: res.message });
    }
  };

  const handleFormNext = (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchedEmp) {
      setStatusMsg({ success: false, text: 'Please enter a valid Mobile Number or Employee ID.' });
      return;
    }

    if (!isOtpVerified) {
      setStatusMsg({ success: false, text: 'Please verify your identity with WhatsApp OTP.' });
      return;
    }

    if (!fromDate || !toDate) {
      setStatusMsg({ success: false, text: 'Please select From Date and To Date.' });
      return;
    }

    if (new Date(toDate) < new Date(fromDate)) {
      setStatusMsg({ success: false, text: 'End Date cannot be earlier than Start Date.' });
      return;
    }

    if (!reason.trim()) {
      setStatusMsg({ success: false, text: 'Please enter your leave reason / letter.' });
      return;
    }

    setStatusMsg(null);
    setStep('CONFIRMATION');
  };

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
        designation: matchedEmp.designation,
        mobile: matchedEmp.mobile || identifierInput,
        fromDate,
        toDate,
        totalDays: calculateDays(),
        isHalfDay,
        halfDayTime: isHalfDay ? halfDayTime : null,
        reason,
        appliedAt: new Date().toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
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
    setCustomStartTime('10:00');
    setCustomEndTime('14:30');
    setReason('');
    setStatusMsg(null);
    setSubmittedSummary(null);
    setIsOtpVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setOtpMsg(null);
    setStep('FORM');
  };

  const employeeInitials = matchedEmp
    ? matchedEmp.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '';

  return (
    <div style={{ width: '100%' }}>
      <style>{`
        .portal-step-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 1.25rem;
          margin-bottom: 1.75rem;
        }
        .portal-step-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #64748b;
        }
        .portal-step-item.active {
          color: #0284c7;
        }
        .portal-step-item.completed {
          color: #16a34a;
        }
        .portal-step-badge {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 700;
          background: #f1f5f9;
          color: #64748b;
        }
        .portal-step-item.active .portal-step-badge {
          background: #0284c7;
          color: #ffffff;
        }
        .portal-step-item.completed .portal-step-badge {
          background: #dcfce7;
          color: #16a34a;
        }
        .portal-step-divider {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
          margin: 0 0.75rem;
        }
        .portal-input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.75rem 0.875rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          color: #0f172a;
          font-size: 16px;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          font-family: inherit;
        }
        .portal-input:focus {
          border-color: #0284c7;
          box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.12);
        }
        .portal-label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #334155;
          margin-bottom: 0.375rem;
        }
        .portal-hint {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.35rem;
          line-height: 1.4;
        }
        .portal-chip-btn {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 0.25rem 0.6rem;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #475569;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .portal-chip-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .portal-primary-btn {
          width: 100%;
          padding: 0.875rem 1.25rem;
          background: #0284c7;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9375rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: background-color 0.15s ease, opacity 0.15s ease;
        }
        .portal-primary-btn:hover:not(:disabled) {
          background: #0369a1;
        }
        .portal-primary-btn:disabled {
          background: #f1f5f9;
          color: #94a3b8;
          border: 1px solid #e2e8f0;
          cursor: not-allowed;
        }
        .segmented-btn {
          flex: 1;
          padding: 0.55rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
          text-align: center;
        }
        .segmented-btn.active {
          background: #0284c7;
          color: #ffffff;
          border-color: #0284c7;
        }
        .segmented-btn.inactive {
          background: #ffffff;
          color: #475569;
          border-color: #cbd5e1;
        }
        .segmented-btn.inactive:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        @media (max-width: 480px) {
          .portal-step-text {
            display: none;
          }
        }
      `}</style>

      {/* Step Indicator */}
      <nav className="portal-step-nav" aria-label="Leave Application Steps">
        <div className={`portal-step-item ${step === 'FORM' ? 'active' : 'completed'}`}>
          <div className="portal-step-badge">
            {step === 'FORM' ? '1' : <Check size={13} />}
          </div>
          <span className="portal-step-text">Application Details</span>
        </div>

        <div className="portal-step-divider" />

        <div
          className={`portal-step-item ${
            step === 'CONFIRMATION' ? 'active' : step === 'SUCCESS' ? 'completed' : ''
          }`}
        >
          <div className="portal-step-badge">
            {step === 'SUCCESS' ? <Check size={13} /> : '2'}
          </div>
          <span className="portal-step-text">Review & Verify</span>
        </div>

        <div className="portal-step-divider" />

        <div className={`portal-step-item ${step === 'SUCCESS' ? 'active' : ''}`}>
          <div className="portal-step-badge">3</div>
          <span className="portal-step-text">Confirmation</span>
        </div>
      </nav>

      {/* Alert Messages */}
      {statusMsg && (
        <div
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            background: statusMsg.success ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${statusMsg.success ? '#bbf7d0' : '#fecaca'}`,
            color: statusMsg.success ? '#15803d' : '#b91c1c',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {statusMsg.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 3: SUBMISSION SUCCESS SCREEN (LIGHT MODE)               */}
      {/* ============================================================ */}
      {step === 'SUCCESS' && (
        <div style={{ textAlign: 'center', padding: '1rem 0' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              margin: '0 auto 1.25rem auto',
              borderRadius: '50%',
              background: '#dcfce7',
              border: '1px solid #86efac',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
            }}
          >
            <Check size={28} />
          </div>

          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 0.5rem 0',
            }}
          >
            Application Submitted
          </h2>

          <p
            style={{
              color: '#64748b',
              fontSize: '0.875rem',
              margin: '0 auto 1.5rem auto',
              lineHeight: '1.5',
              maxWidth: '460px',
            }}
          >
            Your leave request for{' '}
            <strong style={{ color: '#0f172a' }}>{submittedSummary?.empName}</strong> has been
            logged with HR Administration with status{' '}
            <span
              style={{
                color: '#b45309',
                fontWeight: 600,
                background: '#fef3c7',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
              }}
            >
              Pending Approval
            </span>
            .
          </p>

          <div
            style={{
              textAlign: 'left',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              display: 'grid',
              gap: '0.85rem',
              fontSize: '0.8125rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <span style={{ color: '#64748b' }}>Employee</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                {submittedSummary?.empName} ({submittedSummary?.empId})
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <span style={{ color: '#64748b' }}>Duration</span>
              <span style={{ fontWeight: 600, color: '#0284c7' }}>
                {submittedSummary?.totalDays}{' '}
                {submittedSummary?.isHalfDay
                  ? `Day (${submittedSummary?.halfDayTime})`
                  : submittedSummary?.totalDays === 1
                  ? 'Day'
                  : 'Days'}{' '}
                ({submittedSummary?.fromDate} → {submittedSummary?.toDate})
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <span style={{ color: '#64748b' }}>Contact</span>
              <span style={{ color: '#0f172a' }}>
                +91 {submittedSummary?.mobile?.replace(/\D/g, '').slice(-10)}
              </span>
            </div>

            <div>
              <span style={{ color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                Reason
              </span>
              <div
                style={{
                  color: '#334155',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  fontStyle: 'italic',
                  lineHeight: '1.45',
                }}
              >
                &ldquo;{submittedSummary?.reason}&rdquo;
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 2: REVIEW & CONFIRMATION SCREEN (LIGHT MODE)            */}
      {/* ============================================================ */}
      {step === 'CONFIRMATION' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div>
            <h2
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#0f172a',
                margin: '0 0 0.25rem 0',
              }}
            >
              Review Application Details
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.8125rem', margin: 0 }}>
              Verify your employee details and leave period before dispatching to HR.
            </p>
          </div>

          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1.25rem',
              display: 'grid',
              gap: '1rem',
              fontSize: '0.875rem',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.85rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                  Applicant
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                  {matchedEmp?.name}
                </span>
                <span style={{ color: '#0284c7', fontSize: '0.8125rem', marginLeft: '0.4rem', fontWeight: 600 }}>
                  ({matchedEmp?.employeeId})
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.75rem',
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '6px',
                  fontWeight: 600,
                }}
              >
                Verified
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '0.75rem',
                paddingBottom: '0.85rem',
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                  From Date
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{fromDate}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                  To Date
                </span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>{toDate}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>
                  Total Duration
                </span>
                <span style={{ fontWeight: 600, color: '#0284c7' }}>
                  {calculateDays()}{' '}
                  {isHalfDay
                    ? `Day (${halfDayTime})`
                    : calculateDays() === 1
                    ? 'Day'
                    : 'Days'}
                </span>
              </div>
            </div>

            <div>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  display: 'block',
                  marginBottom: '0.35rem',
                }}
              >
                Formal Reason
              </span>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  padding: '0.875rem',
                  borderRadius: '6px',
                  color: '#334155',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {reason}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.6fr',
              gap: '0.75rem',
            }}
          >
            <button
              type="button"
              onClick={() => setStep('FORM')}
              disabled={submitting}
              style={{
                padding: '0.875rem',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              Back to Edit
            </button>

            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={submitting}
              style={{
                padding: '0.875rem',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.9375rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? 'Submitting...' : 'Confirm & Submit to HR'}
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* STEP 1: INITIAL APPLICATION FORM (LIGHT MODE)                */}
      {/* ============================================================ */}
      {step === 'FORM' && (
        <form onSubmit={handleFormNext} style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Section 1: Employee Identification */}
          <div>
            <label className="portal-label">
              Contact Mobile Number or Employee ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 9876543210 or EMP001"
              value={identifierInput}
              onChange={(e) => {
                setIdentifierInput(e.target.value);
                if (statusMsg) setStatusMsg(null);
                if (isOtpVerified) {
                  setIsOtpVerified(false);
                  setOtpSent(false);
                  setOtpInput('');
                }
              }}
              required
              className="portal-input"
            />
            <p className="portal-hint">
              Enter your registered mobile number or Employee ID to load your profile.
            </p>

            {/* Profile Match Result */}
            {matchedEmp ? (
              <div
                style={{
                  marginTop: '0.875rem',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'grid',
                  gap: '0.85rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        background: '#e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        color: '#1e293b',
                        fontSize: '0.875rem',
                      }}
                    >
                      {employeeInitials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#0f172a' }}>
                        {matchedEmp.name}{' '}
                        <span style={{ color: '#0284c7', fontWeight: 600, fontSize: '0.8125rem' }}>
                          ({matchedEmp.employeeId})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {matchedEmp.department || 'Staff'}{' '}
                        {matchedEmp.designation ? `· ${matchedEmp.designation}` : ''}
                      </div>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: matchedEmp.suddenLeavePenalty ? '#b45309' : '#15803d',
                      background: matchedEmp.suddenLeavePenalty ? '#fef3c7' : '#dcfce7',
                      border: `1px solid ${matchedEmp.suddenLeavePenalty ? '#fde68a' : '#bbf7d0'}`,
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px',
                      fontWeight: 500,
                    }}
                  >
                    {matchedEmp.suddenLeavePenalty
                      ? 'Formal letter waives 2x deduction'
                      : 'Standard Leave Policy'}
                  </span>
                </div>

                {/* WhatsApp Verification Sub-row */}
                <div
                  style={{
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #e2e8f0',
                    display: 'grid',
                    gap: '0.5rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <ShieldCheck
                        size={16}
                        style={{ color: isOtpVerified ? '#16a34a' : '#0284c7' }}
                      />
                      <span style={{ fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>
                        WhatsApp Verification: +91{' '}
                        {(matchedEmp.mobile || identifierInput).replace(/\D/g, '').slice(-10)}
                      </span>
                    </div>

                    {isOtpVerified && (
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: '#15803d',
                          background: '#dcfce7',
                          border: '1px solid #bbf7d0',
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                        }}
                      >
                        <Check size={14} />
                        Verified
                      </span>
                    )}
                  </div>

                  {!isOtpVerified && (
                    <div>
                      {!otpSent ? (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={otpLoading}
                          style={{
                            padding: '0.55rem 0.95rem',
                            background: '#16a34a',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: otpLoading ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                          }}
                        >
                          <Send size={13} />
                          <span>
                            {otpLoading ? 'Sending code...' : 'Send WhatsApp Verification Code'}
                          </span>
                        </button>
                      ) : (
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Enter 6-digit OTP"
                              value={otpInput}
                              onChange={(e) =>
                                setOtpInput(e.target.value.replace(/\D/g, ''))
                              }
                              className="portal-input"
                              style={{
                                width: '160px',
                                textAlign: 'center',
                                letterSpacing: '0.2em',
                                fontWeight: 700,
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleVerifyOtp}
                              disabled={otpLoading || otpInput.length < 6}
                              style={{
                                padding: '0.55rem 1rem',
                                background: otpInput.length >= 6 ? '#0284c7' : '#f1f5f9',
                                color: otpInput.length >= 6 ? '#ffffff' : '#94a3b8',
                                border: otpInput.length >= 6 ? 'none' : '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                cursor:
                                  otpLoading || otpInput.length < 6
                                    ? 'not-allowed'
                                    : 'pointer',
                              }}
                            >
                              {otpLoading ? 'Verifying...' : 'Verify OTP'}
                            </button>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.75rem',
                            }}
                          >
                            <span style={{ color: '#64748b' }}>
                              Did not receive code?
                            </span>
                            <button
                              type="button"
                              onClick={handleSendOtp}
                              disabled={otpLoading}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#0284c7',
                                cursor: 'pointer',
                                padding: 0,
                                textDecoration: 'underline',
                              }}
                            >
                              Resend
                            </button>
                          </div>
                        </div>
                      )}

                      {otpMsg && (
                        <div
                          style={{
                            fontSize: '0.75rem',
                            color: otpMsg.success ? '#15803d' : '#b91c1c',
                            marginTop: '0.35rem',
                          }}
                        >
                          {otpMsg.text}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : identifierInput.trim() ? (
              <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                No active employee record found with this identifier.
              </p>
            ) : null}
          </div>

          {/* Section 2: Dates */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <label className="portal-label" style={{ margin: 0 }}>
                Leave Dates <span style={{ color: '#dc2626' }}>*</span>
              </label>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="portal-chip-btn"
                  onClick={() => setQuickDate(0, 1)}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="portal-chip-btn"
                  onClick={() => setQuickDate(1, 1)}
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  className="portal-chip-btn"
                  onClick={() => setQuickDate(1, 3)}
                >
                  Next 3 Days
                </button>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                  From
                </span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    if (!toDate) setToDate(e.target.value);
                  }}
                  required
                  className="portal-input"
                  style={{ colorScheme: 'light' }}
                />
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>
                  To
                </span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  required
                  className="portal-input"
                  style={{ colorScheme: 'light' }}
                />
              </div>
            </div>

            {fromDate && toDate && (
              <div
                style={{
                  marginTop: '0.5rem',
                  fontSize: '0.8125rem',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 500,
                }}
              >
                <Clock size={14} />
                <span>
                  Total duration: <strong style={{ color: '#0f172a' }}>{calculateDays()}</strong>{' '}
                  {isHalfDay ? 'day (half-day)' : calculateDays() === 1 ? 'day' : 'days'}
                </span>
              </div>
            )}
          </div>

          {/* Section 3: Half Day Option with Custom Time Selection */}
          <div
            style={{
              padding: '1rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'grid',
              gap: '0.85rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={isHalfDay}
                onChange={(e) => setIsHalfDay(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#0284c7' }}
              />
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                This is a Half Day Leave
              </span>
            </label>

            {isHalfDay && (
              <div
                style={{
                  paddingTop: '0.85rem',
                  borderTop: '1px solid #e2e8f0',
                  display: 'grid',
                  gap: '0.75rem',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Select Session Timing:
                </span>

                {/* Segmented Shift Selector */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => handleHalfDayTypeChange('FIRST_HALF')}
                    className={`segmented-btn ${halfDayType === 'FIRST_HALF' ? 'active' : 'inactive'}`}
                  >
                    Morning (09:00 - 13:30)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHalfDayTypeChange('SECOND_HALF')}
                    className={`segmented-btn ${halfDayType === 'SECOND_HALF' ? 'active' : 'inactive'}`}
                  >
                    Evening (13:30 - 18:00)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleHalfDayTypeChange('CUSTOM')}
                    className={`segmented-btn ${halfDayType === 'CUSTOM' ? 'active' : 'inactive'}`}
                  >
                    Custom Time
                  </button>
                </div>

                {/* Custom Time Range Selector */}
                {halfDayType === 'CUSTOM' && (
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.85rem',
                      display: 'grid',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <label className="portal-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={customStartTime}
                          onChange={(e) => updateCustomTime(e.target.value, customEndTime)}
                          className="portal-input"
                          style={{ padding: '0.5rem 0.65rem', fontSize: '15px' }}
                        />
                      </div>

                      <div>
                        <label className="portal-label" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                          End Time
                        </label>
                        <input
                          type="time"
                          value={customEndTime}
                          onChange={(e) => updateCustomTime(customStartTime, e.target.value)}
                          className="portal-input"
                          style={{ padding: '0.5rem 0.65rem', fontSize: '15px' }}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#0284c7',
                        background: '#f0f9ff',
                        padding: '0.35rem 0.6rem',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: '#475569' }}>Selected Custom Range:</span>
                      <strong style={{ color: '#0284c7' }}>{halfDayTime}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Formal Reason */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                flexWrap: 'wrap',
                gap: '0.4rem',
              }}
            >
              <label className="portal-label" style={{ margin: 0 }}>
                Formal Reason / Leave Letter <span style={{ color: '#dc2626' }}>*</span>
              </label>

              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  className="portal-chip-btn"
                  onClick={() => handleQuickReason('Medical appointment')}
                >
                  Medical
                </button>
                <button
                  type="button"
                  className="portal-chip-btn"
                  onClick={() => handleQuickReason('Urgent personal work')}
                >
                  Personal
                </button>
                <button
                  type="button"
                  className="portal-chip-btn"
                  onClick={() => handleQuickReason('Family occasion')}
                >
                  Family
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="State your formal explanation or reason (e.g. Taking leave due to doctor appointment or personal emergency)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              className="portal-input"
              style={{ resize: 'vertical', lineHeight: '1.5' }}
            />
            <p className="portal-hint">
              Formal leave letters submitted in advance protect your record from sudden unauthorized
              absence penalties.
            </p>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={!matchedEmp || !isOtpVerified}
            className="portal-primary-btn"
          >
            {!matchedEmp ? (
              <span>Enter Mobile Number or Emp ID to Continue</span>
            ) : !isOtpVerified ? (
              <span>Complete WhatsApp Verification to Continue</span>
            ) : (
              <>
                <span>Review & Submit Leave</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
