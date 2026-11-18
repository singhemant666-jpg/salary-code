'use client';

import React, { useState, useEffect } from 'react';
import { requestPortalOtp, verifyPortalOtp, PortalSessionEmployee } from '@/actions/portal-auth';
import { MessageSquare, ArrowRight, Loader2, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';
import { MpcgBrandMark } from '@/components/brand/MpcgLogo';
import './portal.css';

interface PortalLoginProps {
  onLoginSuccess?: (emp: PortalSessionEmployee) => void;
}

export default function PortalLogin({ onLoginSuccess }: PortalLoginProps) {
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'ID' | 'OTP'>('ID');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your Mobile Number or Employee ID.');
      return;
    }

    setError(null);
    setInfoMessage(null);
    setDemoOtp(null);
    setLoading(true);

    try {
      const res = await requestPortalOtp(identifier);
      if (res.success) {
        setStep('OTP');
        setInfoMessage(res.message);
        if (res.targetMobile) setMaskedMobile(res.targetMobile);
        if (res.demoOtp) setDemoOtp(res.demoOtp);
        setResendTimer(45);
      } else {
        setError(res.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send WhatsApp OTP. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      setError('Please enter the 6-digit WhatsApp OTP.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await verifyPortalOtp(identifier, otp);
      if (res.success && res.employee) {
        if (onLoginSuccess) {
          onLoginSuccess(res.employee);
        } else {
          window.location.reload();
        }
      } else {
        setError(res.message || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to verify OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-wrapper">
      {/* Brand Header */}
      <div className="portal-login-header">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.85rem' }}>
          <MpcgBrandMark size={70} />
        </div>
        <h1 className="portal-brand-title">MY PAIN CLINIC GLOBAL</h1>
        <p className="portal-brand-subtitle">Employee Self-Service Portal</p>
      </div>

      {/* Main Login Card */}
      <div className="portal-login-card">
        {step === 'ID' ? (
          <form onSubmit={handleRequestOtp}>
            <div className="portal-form-group">
              <label className="portal-form-label">
                Mobile Number / Employee Code
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. 9876543210 or MPC-175"
                autoFocus
                className="portal-text-input"
              />
              <p
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: '#64748b',
                  marginTop: '0.65rem',
                  lineHeight: '1.4',
                }}
              >
                <MessageSquare size={14} color="#059669" style={{ flexShrink: 0 }} />
                <span>We will send an instant login OTP to your WhatsApp.</span>
              </p>
            </div>

            {error && (
              <div className="portal-alert-error">
                <AlertCircle size={16} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="portal-btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Checking Profile...</span>
                </>
              ) : (
                <>
                  <span>Send WhatsApp OTP</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  margin: '0 auto 0.5rem auto',
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                }}
              >
                <MessageSquare size={20} />
              </div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Enter WhatsApp OTP
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.25rem' }}>
                Sent to registered number <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{maskedMobile || identifier}</strong>
              </p>
            </div>

            {infoMessage && <div className="portal-alert-success">{infoMessage}</div>}

            {demoOtp && (
              <div className="portal-alert-demo">
                Development OTP: <strong>{demoOtp}</strong>
              </div>
            )}

            <div className="portal-form-group">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                autoFocus
                className="portal-otp-input"
              />
            </div>

            {error && (
              <div className="portal-alert-error">
                <AlertCircle size={16} color="#e11d48" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="portal-btn-primary"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <UserCheck size={16} />
                  <span>Verify & Access Portal</span>
                </>
              )}
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '1rem',
                fontSize: '0.78rem',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setStep('ID');
                  setOtp('');
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0,
                  fontWeight: 600,
                }}
              >
                ← Change Number / ID
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={() => handleRequestOtp()}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendTimer > 0 ? '#94a3b8' : '#0f172a',
                  cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontWeight: 700,
                  padding: 0,
                }}
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>{resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}</span>
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ textAlign: 'center', paddingBottom: '1rem', marginTop: '1.5rem' }}>
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
          Secured by My Pain Clinic Global attendance & payroll cloud.
        </p>
      </div>
    </div>
  );
}
