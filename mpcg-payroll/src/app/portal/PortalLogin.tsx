'use client';

import React, { useState, useEffect } from 'react';
import { requestPortalOtp, verifyPortalOtp, PortalSessionEmployee } from '@/actions/portal-auth';
import { ShieldCheck, MessageSquare, ArrowRight, Loader2, RefreshCw, UserCheck, AlertCircle } from 'lucide-react';

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
          // Hard reload page to reload with cookie
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
    <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0d1527] to-[#070b14] text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Brand Header */}
      <div className="w-full max-w-md mx-auto pt-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-xl shadow-cyan-900/30 mb-3 border border-cyan-400/20">
          <ShieldCheck className="w-9 h-9 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white uppercase sm:text-2xl">
          MY PAIN CLINIC GLOBAL
        </h1>
        <p className="text-xs sm:text-sm text-cyan-400/90 font-medium tracking-wide mt-1">
          Employee Self-Service Portal
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {step === 'ID' ? (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Mobile Number / Employee Code
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 9876543210 or MPC-175"
                  autoFocus
                  className="w-full px-4 py-3.5 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-base font-medium transition"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                We will send an instant login OTP to your WhatsApp.
              </p>
            </div>

            {error && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold rounded-2xl shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking Profile...</span>
                </>
              ) : (
                <>
                  <span>Send WhatsApp OTP</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-white">Enter WhatsApp OTP</h2>
              <p className="text-xs text-slate-400 mt-1">
                Sent to registered number <span className="font-mono text-cyan-300">{maskedMobile || identifier}</span>
              </p>
            </div>

            {infoMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-300">
                {infoMessage}
              </div>
            )}

            {demoOtp && (
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-xs text-cyan-300 text-center font-mono">
                Development/Demo OTP: <strong>{demoOtp}</strong>
              </div>
            )}

            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="6-digit OTP"
                autoFocus
                className="w-full tracking-[0.5em] text-center text-2xl font-mono py-3.5 bg-slate-950/70 border border-slate-700/80 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Session...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Verify & Access Portal</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('ID');
                  setOtp('');
                  setError(null);
                }}
                className="text-slate-400 hover:text-white transition"
              >
                ← Change Number / ID
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={() => handleRequestOtp()}
                className="text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 flex items-center gap-1 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="w-full max-w-md mx-auto pb-4 text-center">
        <p className="text-[11px] text-slate-500">
          Secured by My Pain Clinic Global attendance & payroll cloud.
        </p>
      </div>
    </div>
  );
}
