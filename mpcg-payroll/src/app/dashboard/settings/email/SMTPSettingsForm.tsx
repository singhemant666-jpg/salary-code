'use client';

import { useState } from 'react';
import { saveSMTPSettings, testSMTPConnection } from '@/actions/salary-slip-email';
import { SMTPSettings } from '@/lib/email';
import { Mail, Server, Lock, User, Send, CheckCircle, Save, AlertCircle } from 'lucide-react';

export default function SMTPSettingsForm({ initialConfig }: { initialConfig: SMTPSettings }) {
  const [config, setConfig] = useState<SMTPSettings>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (key: keyof SMTPSettings, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    const result = await saveSMTPSettings(config);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
    setSaving(false);
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      setTestResult({ type: 'error', text: 'Please enter a target email address for testing.' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    const res = await testSMTPConnection(testEmail);
    if (res.success) {
      setTestResult({ type: 'success', text: res.message });
    } else {
      setTestResult({ type: 'error', text: res.message });
    }
    setTesting(false);
  };

  return (
    <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {statusMessage && (
        <div style={{
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          background: statusMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${statusMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: statusMessage.type === 'success' ? '#22c55e' : '#ef4444',
          fontSize: '0.875rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {statusMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Server size={18} style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>SMTP Server Credentials</h3>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">SMTP Host Server *</label>
              <input
                type="text"
                className="form-input"
                value={config.host}
                onChange={(e) => handleChange('host', e.target.value)}
                placeholder="e.g. smtp.gmail.com or smtp.office365.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SMTP Port *</label>
              <input
                type="number"
                className="form-input"
                value={config.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value) || 465)}
                placeholder="465 (SSL) or 587 (TLS)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SMTP Username / Email *</label>
              <input
                type="email"
                className="form-input"
                value={config.user}
                onChange={(e) => handleChange('user', e.target.value)}
                placeholder="e.g. your-email@gmail.com"
              />
            </div>

            <div className="form-group">
              <label className="form-label">SMTP Password / App Password *</label>
              <input
                type="password"
                className="form-input"
                value={config.pass}
                onChange={(e) => handleChange('pass', e.target.value)}
                placeholder="Enter password or leave blank if set in .env"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Lock size={12} style={{ color: '#10b981' }} />
                <span>Can be set securely in <code>.env</code> as <code>SMTP_PASS</code>. Leaving blank will use the <code>.env</code> secret.</span>
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Sender Name</label>
              <input
                type="text"
                className="form-input"
                value={config.fromName}
                onChange={(e) => handleChange('fromName', e.target.value)}
                placeholder="MY PAIN CLINIC GLOBAL Payroll"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sender Email Address</label>
              <input
                type="email"
                className="form-input"
                value={config.fromEmail}
                onChange={(e) => handleChange('fromEmail', e.target.value)}
                placeholder="payroll@mypainclinicglobal.com"
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ gap: '0.5rem' }}>
          <Save size={18} />
          {saving ? 'Saving SMTP Settings...' : 'Save Email Settings'}
        </button>
      </form>

      {/* Test Connection Panel */}
      <div className="glass-card-static">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Send size={18} style={{ color: '#25D366' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Test SMTP Email Connection</h3>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="email"
            className="form-input"
            style={{ flex: 1 }}
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="Enter target recipient email for testing"
          />

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSendTest}
            disabled={testing}
            style={{ gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <Send size={16} />
            {testing ? 'Sending Test Email...' : 'Send Test Email'}
          </button>
        </div>

        {testResult && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: testResult.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: testResult.type === 'success' ? '#22c55e' : '#ef4444',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}>
            {testResult.text}
          </div>
        )}
      </div>
    </div>
  );
}
