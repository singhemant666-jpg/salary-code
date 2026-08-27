'use client';

import { useState, useEffect } from 'react';
import { savePayrollSettings, getPayrollSettings } from '@/actions/payroll';
import { Settings, Save } from 'lucide-react';

interface SettingsData {
  standard_working_hours: string;
  half_day_threshold: string;
  late_threshold_minutes: string;
  overtime_after_hours: string;
  shift_start_time: string;
  shift_end_time: string;
  weekly_off_days: string;
  lop_calculation_method: string;
  lop_based_on: string;
  overtime_rate_per_hour: string;
  company_name: string;
  company_address: string;
  realtime_cloud_url?: string;
  realtime_company_code?: string;
  realtime_username?: string;
  realtime_password?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    standard_working_hours: '8',
    half_day_threshold: '4',
    late_threshold_minutes: '15',
    overtime_after_hours: '8',
    shift_start_time: '09:00',
    shift_end_time: '18:00',
    weekly_off_days: '[0]',
    lop_calculation_method: 'fixed30',
    lop_based_on: 'gross',
    overtime_rate_per_hour: '100',
    company_name: 'MY PAIN CLINIC GLOBAL',
    company_address: '',
    realtime_cloud_url: 'http://realsoftcloud.com:85',
    realtime_company_code: '',
    realtime_username: '',
    realtime_password: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch settings on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getPayrollSettings();
        // Extract raw settings from DB including custom keys
        const res = await fetch('/api/biometric/sync?token=CHECK_EXISTING'); // dummy call just to get settings or fetch via simple action
      } catch {}
      
      // Let's call a server action or fetch to load them
      try {
        const response = await fetch('/api/biometric/debug'); // dummy to check if online
      } catch {}
    }
    loadSettings();
  }, []);

  // Fetch all db settings dynamically using a client-side fetch or inline load
  useEffect(() => {
    async function fetchDbSettings() {
      try {
        const response = await fetch('/api/biometric/settings');
        if (response.ok) {
          const dbSettings = await response.json();
          setSettings(prev => ({ ...prev, ...dbSettings }));
        }
      } catch (err) {
        console.error('Failed to load DB settings:', err);
      }
    }
    fetchDbSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const formData = new FormData();
    Object.entries(settings).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const result = await savePayrollSettings(formData);
    setMessage(result.message);
    setSaving(false);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll Settings</h1>
          <p className="page-subtitle">Configure working hours, LOP calculation, and other payroll rules</p>
        </div>
      </div>

      {message && (
        <div style={{
          padding: '0.875rem 1.25rem',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: '10px',
          color: '#86efac',
          fontSize: '0.875rem',
          marginBottom: '1.5rem',
        }}>
          {message}
        </div>
      )}

      {/* Settings Navigation Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <a href="/dashboard/settings/ai" style={{ textDecoration: 'none' }}>
          <div className="glass-card-static" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', border: '1px solid rgba(99, 102, 241, 0.3)', background: 'rgba(99, 102, 241, 0.06)' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8' }}>
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>AI Salary Engine</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Groq / OpenRouter / NVIDIA</div>
            </div>
          </div>
        </a>

        <a href="/dashboard/settings/salary-slip-layout" style={{ textDecoration: 'none' }}>
          <div className="glass-card-static" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
              📄
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Salary Slip Layout</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Logos, Headers & Signatures</div>
            </div>
          </div>
        </a>

        <a href="/dashboard/settings/whatsapp" style={{ textDecoration: 'none' }}>
          <div className="glass-card-static" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80' }}>
              💬
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>WhatsApp Gateway</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Slip Dispatch Config</div>
            </div>
          </div>
        </a>

        <a href="/dashboard/settings/email" style={{ textDecoration: 'none' }}>
          <div className="glass-card-static" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa' }}>
              ✉️
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Email SMTP</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Automated Email Dispatch</div>
            </div>
          </div>
        </a>
      </div>

      {/* Per-Employee Notice */}
      <div style={{
        padding: '1rem 1.25rem',
        background: 'rgba(6,182,212,0.08)',
        border: '1px solid rgba(6,182,212,0.2)',
        borderRadius: '10px',
        color: '#22d3ee',
        fontSize: '0.875rem',
        marginBottom: '1.5rem',
      }}>
        💡 <strong>Per-Employee Working Hours Active:</strong> Actual IN/OUT punch times reflect directly from your uploaded biometric sheet. Required daily working hours (e.g., 8 Hours vs 9 Hours) are set individually in each <strong>Employee Profile</strong> (Employees → View → Edit Profile).
      </div>

      <form onSubmit={handleSubmit}>


        {/* LOP & Overtime */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>LOP & Overtime Settings</h3>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">LOP Calculation Method</label>
              <select className="form-select"
                value={settings.lop_calculation_method}
                onChange={e => setSettings({...settings, lop_calculation_method: e.target.value})}
              >
                <option value="calendar">Calendar Day (Salary ÷ Days in Month)</option>
                <option value="fixed30">Fixed 30 Day (Salary ÷ 30)</option>
              </select>
              <span className="form-hint">How to calculate per-day deduction</span>
            </div>
            <div className="form-group">
              <label className="form-label">LOP Based On</label>
              <select className="form-select"
                value={settings.lop_based_on}
                onChange={e => setSettings({...settings, lop_based_on: e.target.value})}
              >
                <option value="gross">Gross Salary (Basic+HRA+Conv+Other)</option>
                <option value="basic">Basic Salary Only</option>
                <option value="basic_hra">Basic + HRA</option>
              </select>
              <span className="form-hint">Which salary base to use for LOP</span>
            </div>
            <div className="form-group">
              <label className="form-label">Overtime Rate (₹/hour)</label>
              <input type="number" step="0.01" className="form-input"
                value={settings.overtime_rate_per_hour}
                onChange={e => setSettings({...settings, overtime_rate_per_hour: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Weekly Off Days</label>
              <select className="form-select"
                value={settings.weekly_off_days}
                onChange={e => setSettings({...settings, weekly_off_days: e.target.value})}
              >
                <option value="[0]">Sunday only</option>
                <option value="[0,6]">Saturday & Sunday</option>
                <option value="[5,6]">Friday & Saturday</option>
              </select>
            </div>
          </div>
        </div>

        {/* Realtime Biometric Cloud Settings */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📡 Realtime RS 70 Biometric Cloud Integration
          </h3>
          <p className="text-xs text-muted" style={{ marginBottom: '1rem' }}>
            Configure your Realsoft Cloud (<code style={{ color: 'var(--accent-primary)' }}>http://realsoftcloud.com:85</code>) credentials for 1-click automatic punch log synchronization.
          </p>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Realsoft Cloud Server URL</label>
              <input
                className="form-input"
                placeholder="http://realsoftcloud.com:85"
                value={(settings as any).realtime_cloud_url || 'http://realsoftcloud.com:85'}
                onChange={e => setSettings({...settings, realtime_cloud_url: e.target.value} as any)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company Code / Customer ID</label>
              <input
                className="form-input"
                placeholder="e.g. MPCG01"
                value={(settings as any).realtime_company_code || ''}
                onChange={e => setSettings({...settings, realtime_company_code: e.target.value} as any)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Realsoft Cloud Username</label>
              <input
                className="form-input"
                placeholder="Admin username"
                value={(settings as any).realtime_username || ''}
                onChange={e => setSettings({...settings, realtime_username: e.target.value} as any)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Realsoft Cloud Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Admin password"
                value={(settings as any).realtime_password || ''}
                onChange={e => setSettings({...settings, realtime_password: e.target.value} as any)}
              />
            </div>
          </div>
        </div>

        {/* Company */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Company Information</h3>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input className="form-input"
                value={settings.company_name}
                onChange={e => setSettings({...settings, company_name: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Company Address</label>
              <input className="form-input"
                value={settings.company_address}
                onChange={e => setSettings({...settings, company_address: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
