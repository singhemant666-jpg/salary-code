'use client';

import { useState } from 'react';
import { saveWhatsAppConfig, testWhatsAppMessage } from '@/actions/whatsapp-settings';
import { WhatsAppSettings } from '@/lib/whatsapp';
import { MessageSquare, Key, Phone, CheckCircle, Save, Send, Shield, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';

export default function WhatsAppSettingsForm({ initialConfig }: { initialConfig: WhatsAppSettings }) {
  const [config, setConfig] = useState<WhatsAppSettings>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [testMobile, setTestMobile] = useState('');
  const [testing, setTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = (key: keyof WhatsAppSettings) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: keyof WhatsAppSettings, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    const result = await saveWhatsAppConfig(config);
    if (result.success) {
      setStatusMessage({ type: 'success', text: result.message });
    } else {
      setStatusMessage({ type: 'error', text: result.message });
    }
    setSaving(false);
  };

  const handleSendTest = async () => {
    if (!testMobile) {
      setTestResult({ type: 'error', text: 'Please enter a mobile number for testing.' });
      return;
    }
    setTesting(true);
    setTestResult(null);

    const res = await testWhatsAppMessage(testMobile);
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
        {/* Enable / Disable Switch */}
        <div className="glass-card-static" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} style={{ color: '#25D366' }} /> Enable WhatsApp Notifications
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Automatically send WhatsApp alerts to employees upon Login (Check-in) and Logout (Check-out).
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleToggle('enabled')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            {config.enabled ? (
              <ToggleRight size={44} color="#25D366" />
            ) : (
              <ToggleLeft size={44} color="#94a3b8" />
            )}
          </button>
        </div>

        {/* Gupshup API Configuration */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Key size={18} style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Gupshup WhatsApp API Credentials</h3>
          </div>

          <div className="grid-2" style={{ gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Gupshup API Key *</label>
              <input
                type="password"
                className="form-input"
                value={config.apiKey}
                onChange={(e) => handleChange('apiKey', e.target.value)}
                placeholder="Enter Gupshup API Key or leave blank if set in .env"
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Shield size={12} style={{ color: '#10b981' }} />
                <span>Can be set securely in <code>.env</code> as <code>GUPSHUP_API_KEY</code>. Leaving blank will use the <code>.env</code> value.</span>
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Gupshup App Name</label>
              <input
                type="text"
                className="form-input"
                value={config.appName}
                onChange={(e) => handleChange('appName', e.target.value)}
                placeholder="e.g. MPCG_Payroll_App"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Gupshup Source Phone Number *</label>
              <input
                type="text"
                className="form-input"
                value={config.sourceNumber}
                onChange={(e) => handleChange('sourceNumber', e.target.value)}
                placeholder="e.g. 919876543210 (With 91 Country Code)"
              />
            </div>
          </div>
        </div>

        {/* Gupshup Approved Templates (For Production 100% Delivery) */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Use Gupshup Approved Templates (Recommended for Live Accounts)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                WhatsApp policy requires approved template messages for business-initiated notifications.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle('useTemplate')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {config.useTemplate ? (
                <ToggleRight size={38} color="#25D366" />
              ) : (
                <ToggleLeft size={38} color="#94a3b8" />
              )}
            </button>
          </div>

          {config.useTemplate && (
            <div className="grid-2" style={{ gap: '1rem', paddingTop: '0.5rem' }}>
              <div className="form-group">
                <label className="form-label">Login Template ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.templateIdLogin || ''}
                  onChange={(e) => handleChange('templateIdLogin', e.target.value)}
                  placeholder="e.g. 04d2b07e-19d8-4243-8f59-fbea38c40b1b"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Logout Template ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.templateIdLogout || ''}
                  onChange={(e) => handleChange('templateIdLogout', e.target.value)}
                  placeholder="e.g. af26e3dd-281a-41fd-ae1d-894bbffcc5a9"
                />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Leave / Employee OTP Template ID</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.templateIdOtp || ''}
                  onChange={(e) => handleChange('templateIdOtp', e.target.value)}
                  placeholder="e.g. a932b713-b730-4dca-bf4c-da46e60b0581"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notification Event Triggers */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Shield size={18} style={{ color: '#8b5cf6' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Automated Alert Triggers</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}
              onClick={() => handleToggle('notifyLogin')}
            >
              <input
                type="checkbox"
                checked={config.notifyLogin}
                onChange={() => {}}
                style={{ width: '18px', height: '18px', accentColor: '#25D366' }}
              />
              <span>Send WhatsApp Notification on <strong>Login / Check-in</strong></span>
            </label>

            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-primary)' }}
              onClick={() => handleToggle('notifyLogout')}
            >
              <input
                type="checkbox"
                checked={config.notifyLogout}
                onChange={() => {}}
                style={{ width: '18px', height: '18px', accentColor: '#25D366' }}
              />
              <span>Send WhatsApp Notification on <strong>Logout / Check-out</strong></span>
            </label>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ gap: '0.5rem' }}>
          <Save size={18} />
          {saving ? 'Saving Settings...' : 'Save WhatsApp Settings'}
        </button>
      </form>

      {/* Test WhatsApp Connection Panel */}
      <div className="glass-card-static" style={{ marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Send size={18} style={{ color: '#25D366' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Test Gupshup WhatsApp Connection</h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Send a test WhatsApp message to your own phone number to verify Gupshup API credentials.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.5rem' }}
              value={testMobile}
              onChange={(e) => setTestMobile(e.target.value)}
              placeholder="e.g. 9876543210"
            />
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSendTest}
            disabled={testing}
            style={{ gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <Send size={16} />
            {testing ? 'Sending Test...' : 'Send Test WhatsApp'}
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
