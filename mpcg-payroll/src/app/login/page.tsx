'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ShieldCheck, Lock, Mail, AlertCircle } from 'lucide-react';
import { MpcgBrandMark } from '@/components/brand/MpcgLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email address or password');
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background ambient orbs */}
      <div style={styles.orbTopRight} />
      <div style={styles.orbBottomLeft} />

      <div style={styles.loginWrapper}>
        {/* Logo & Branding */}
        <div style={styles.brandSection}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <MpcgBrandMark size={76} />
          </div>
          <h1 style={styles.brandTitle}>MY PAIN CLINIC GLOBAL</h1>
          <p style={styles.brandSubtitle}>Enterprise Payroll & Attendance Portal</p>
        </div>

        {/* Login Card */}
        <div style={styles.card}>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={styles.cardTitle}>Sign In</h2>
            <p style={styles.cardSubtitle}>Enter your credentials to access the secure portal</p>
          </div>

          <form
            onSubmit={handleSubmit}
            action="javascript:void(0);"
            style={styles.form}
          >
            {error && (
              <div style={styles.errorBox}>
                <AlertCircle size={16} style={{ flexShrink: 0, color: '#f87171' }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1.15rem' }}>
              <label
                className="form-label"
                htmlFor="email"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '0.45rem',
                }}
              >
                <Mail size={13} style={{ color: '#94a3b8' }} />
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="name@mpcglobal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.35rem' }}>
              <label
                className="form-label"
                htmlFor="password"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '0.45rem',
                }}
              >
                <Lock size={13} style={{ color: '#94a3b8' }} />
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: '0.75rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    color: showPassword ? '#60a5fa' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 150ms ease',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{
                ...styles.submitBtn,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.8 : 1,
              }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={styles.spinner} />
                  Authenticating...
                </>
              ) : (
                'Sign In to Portal'
              )}
            </button>
          </form>

          {/* Security Assurance Footer */}
          <div style={styles.footerNote}>
            <ShieldCheck size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <span>256-Bit Encrypted · Authorized MPCG Access Only</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#070c18',
    position: 'relative',
    overflow: 'hidden',
  },
  orbTopRight: {
    position: 'absolute',
    top: '-20%',
    right: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(37, 99, 235, 0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: '-20%',
    left: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(30, 41, 59, 0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  loginWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1.75rem',
    zIndex: 1,
    width: '100%',
    maxWidth: '430px',
    padding: '2rem 1.25rem',
  },
  brandSection: {
    textAlign: 'center',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#f8fafc',
    letterSpacing: '0.06em',
    lineHeight: 1.25,
  },
  brandSubtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    marginTop: '0.35rem',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
  card: {
    width: '100%',
    background: '#0e1726',
    border: '1px solid rgba(255, 255, 255, 0.09)',
    borderRadius: '16px',
    padding: '2.25rem 2rem',
    boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.65), 0 1px 2px rgba(255, 255, 255, 0.04)',
  },
  cardTitle: {
    fontSize: '1.35rem',
    fontWeight: 700,
    color: '#f8fafc',
    letterSpacing: '-0.02em',
    marginBottom: '0.25rem',
  },
  cardSubtitle: {
    fontSize: '0.85rem',
    color: '#94a3b8',
    lineHeight: 1.4,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: '10px',
    color: '#fca5a5',
    fontSize: '0.85rem',
    marginBottom: '1rem',
  },
  submitBtn: {
    width: '100%',
    fontSize: '0.9375rem',
    fontWeight: 600,
    padding: '0.8rem 1rem',
    background: '#2563eb',
    border: '1px solid #3b82f6',
    boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    borderRadius: '10px',
    color: '#ffffff',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  footerNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: '#94a3b8',
    marginTop: '1.5rem',
    textAlign: 'center',
    fontWeight: 500,
  },
};
