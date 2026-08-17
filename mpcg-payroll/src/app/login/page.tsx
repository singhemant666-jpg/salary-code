'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background gradient orbs */}
      <div style={styles.orbTopRight} />
      <div style={styles.orbBottomLeft} />

      <div style={styles.loginWrapper}>
        {/* Logo & Branding */}
        <div style={styles.brandSection}>
          <img
            src="/logo.png"
            alt="MPC Logo"
            style={{ width: '80px', height: '80px', objectFit: 'contain', margin: '0 auto 1rem', display: 'block' }}
          />
          <h1 style={styles.brandTitle}>MY PAIN CLINIC GLOBAL</h1>
          <p style={styles.brandSubtitle}>Payroll Management System</p>
        </div>

        {/* Login Card */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Welcome Back</h2>
          <p style={styles.cardSubtitle}>Sign in to manage payroll</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && (
              <div style={styles.errorBox}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@mpcglobal.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span style={styles.spinner} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p style={styles.footerText}>
            Secured payroll system · MPCG Internal Use Only
          </p>
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
    background: '#0a0e1a',
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
    background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  orbBottomLeft: {
    position: 'absolute',
    bottom: '-20%',
    left: '-10%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  loginWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2rem',
    zIndex: 1,
    width: '100%',
    maxWidth: '420px',
    padding: '2rem',
  },
  brandSection: {
    textAlign: 'center',
  },
  logoCircle: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1rem',
    boxShadow: '0 0 30px rgba(6,182,212,0.3)',
  },
  logoText: {
    color: '#0f172a',
    fontWeight: 800,
    fontSize: '0.875rem',
    letterSpacing: '0.05em',
  },
  brandTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '0.08em',
  },
  brandSubtitle: {
    fontSize: '0.875rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  card: {
    width: '100%',
    background: 'rgba(17, 24, 39, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '2rem',
  },
  cardTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: '0.25rem',
  },
  cardSubtitle: {
    fontSize: '0.875rem',
    color: '#94a3b8',
    marginBottom: '1.75rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: '10px',
    color: '#fca5a5',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  submitBtn: {
    width: '100%',
    marginTop: '0.5rem',
    fontSize: '0.9375rem',
    padding: '0.75rem',
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 0.6s linear infinite',
  },
  footerText: {
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#475569',
    marginTop: '1.5rem',
  },
};
