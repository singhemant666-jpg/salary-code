'use client';

import { useState, useEffect } from 'react';
import { savePayrollSettings } from '@/actions/payroll';
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
    lop_calculation_method: 'calendar',
    lop_based_on: 'gross',
    overtime_rate_per_hour: '100',
    company_name: 'MY PAIN CLINIC GLOBAL',
    company_address: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const formData = new FormData();
    Object.entries(settings).forEach(([key, value]) => {
      formData.append(key, value);
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
        {/* Working Hours */}
        <div className="glass-card-static" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Global Default Working Hours & Shift</h3>
          <div className="grid-3">
            <div className="form-group">
              <label className="form-label">Standard Working Hours</label>
              <input type="number" step="0.5" className="form-input"
                value={settings.standard_working_hours}
                onChange={e => setSettings({...settings, standard_working_hours: e.target.value})}
              />
              <span className="form-hint">Hours required for &quot;Present&quot; status</span>
            </div>
            <div className="form-group">
              <label className="form-label">Half Day Threshold (hours)</label>
              <input type="number" step="0.5" className="form-input"
                value={settings.half_day_threshold}
                onChange={e => setSettings({...settings, half_day_threshold: e.target.value})}
              />
              <span className="form-hint">Minimum hours for half-day</span>
            </div>
            <div className="form-group">
              <label className="form-label">Late Threshold (minutes)</label>
              <input type="number" className="form-input"
                value={settings.late_threshold_minutes}
                onChange={e => setSettings({...settings, late_threshold_minutes: e.target.value})}
              />
              <span className="form-hint">Minutes after shift start = late</span>
            </div>
            <div className="form-group">
              <label className="form-label">Shift Start Time</label>
              <input type="time" className="form-input"
                value={settings.shift_start_time}
                onChange={e => setSettings({...settings, shift_start_time: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Shift End Time</label>
              <input type="time" className="form-input"
                value={settings.shift_end_time}
                onChange={e => setSettings({...settings, shift_end_time: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Overtime After (hours)</label>
              <input type="number" step="0.5" className="form-input"
                value={settings.overtime_after_hours}
                onChange={e => setSettings({...settings, overtime_after_hours: e.target.value})}
              />
            </div>
          </div>
        </div>

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
