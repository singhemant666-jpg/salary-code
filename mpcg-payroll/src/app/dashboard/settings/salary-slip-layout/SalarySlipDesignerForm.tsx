'use client';

import { useState } from 'react';
import { saveSalarySlipLayoutConfig, SalarySlipLayoutConfig, CustomLineItem } from '@/actions/salary-slip-config';
import { Save, Check, Image as ImageIcon, FileText, PenTool, CheckSquare, Square, Plus, Trash2, DollarSign } from 'lucide-react';

export default function SalarySlipDesignerForm({ initialConfig }: { initialConfig: SalarySlipLayoutConfig }) {
  const [config, setConfig] = useState<SalarySlipLayoutConfig>({
    ...initialConfig,
    customEarnings: initialConfig.customEarnings || [],
    customDeductions: initialConfig.customDeductions || [],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleToggle = (key: keyof SalarySlipLayoutConfig) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChange = (key: keyof SalarySlipLayoutConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  // Custom Line Items handlers
  const addCustomItem = (type: 'customEarnings' | 'customDeductions') => {
    const newItem: CustomLineItem = {
      id: 'custom_' + Date.now(),
      name: type === 'customEarnings' ? 'Special Allowance' : 'Professional Tax',
      defaultValue: '',
      enabled: true,
    };
    setConfig(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), newItem],
    }));
  };

  const updateCustomItem = (type: 'customEarnings' | 'customDeductions', id: string, field: keyof CustomLineItem, value: any) => {
    setConfig(prev => ({
      ...prev,
      [type]: (prev[type] || []).map(item => item.id === id ? { ...item, [field]: value } : item),
    }));
  };

  const removeCustomItem = (type: 'customEarnings' | 'customDeductions', id: string) => {
    setConfig(prev => ({
      ...prev,
      [type]: (prev[type] || []).filter(item => item.id !== id),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const result = await saveSalarySlipLayoutConfig(config);
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setSaving(false);
  };

  // Live preview calculations: filter out zero-amount line items
  const enabledCustomEarnings = (config.customEarnings || []).filter(e => e.enabled && (Number(e.defaultValue) || 0) > 0);
  const enabledCustomDeductions = (config.customDeductions || []).filter(d => d.enabled && (Number(d.defaultValue) || 0) > 0);

  const totalCustomEarningsSum = enabledCustomEarnings.reduce((sum, e) => sum + (Number(e.defaultValue) || 0), 0);
  const totalCustomDeductionsSum = enabledCustomDeductions.reduce((sum, d) => sum + (Number(d.defaultValue) || 0), 0);

  const sampleBasic = 35000;
  const sampleIncentive = config.showIncentive ? 2500 : 0;
  const sampleOvertime = config.showOvertime ? 1200 : 0;
  const sampleGross = sampleBasic + sampleIncentive + sampleOvertime + totalCustomEarningsSum;
  const sampleTotalDeductions = totalCustomDeductionsSum;
  const sampleNet = sampleGross - sampleTotalDeductions;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '460px 1fr', gap: '1.5rem', alignItems: 'flex-start' }}>
      {/* LEFT PANEL: Controls & Custom Items */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {message && (
          <div style={{
            padding: '0.875rem 1.25rem',
            borderRadius: '10px',
            background: message.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${message.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: message.type === 'success' ? '#22c55e' : '#ef4444',
            fontSize: '0.875rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <Check size={18} />
            <span>{message.text}</span>
          </div>
        )}

        {/* Header & Branding Settings */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <ImageIcon size={18} style={{ color: '#06b6d4' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Header & Header Banner</h3>
          </div>

          <div className="form-group">
            <label
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.75rem' }}
              onClick={() => handleToggle('showHeaderLogo')}
            >
              {config.showHeaderLogo ? <CheckSquare size={18} color="#06b6d4" /> : <Square size={18} color="#94a3b8" />}
              Display Header Logo Banner Image
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Company Name Header</label>
            <input
              type="text"
              className="form-input"
              value={config.companyName}
              onChange={(e) => handleChange('companyName', e.target.value)}
              placeholder="MY PAIN CLINIC GLOBAL"
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Salary Slip Document Title</label>
            <input
              type="text"
              className="form-input"
              value={config.slipTitle}
              onChange={(e) => handleChange('slipTitle', e.target.value)}
              placeholder="SALARY SLIP"
            />
          </div>
        </div>

        {/* Standard Rows Visibility */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <FileText size={18} style={{ color: '#22c55e' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Standard Rows Visibility</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {[
              { key: 'showHra', label: 'Show HRA (House Rent Allowance) Row' },
              { key: 'showConveyance', label: 'Show Conveyance Allowance Row' },
              { key: 'showIncentive', label: 'Show Performance Incentive Row' },
              { key: 'showOvertime', label: 'Show Overtime Earnings Row' },
              { key: 'showPfDeduction', label: 'Show PF (Provident Fund) Deduction Row' },
              { key: 'showAdvanceDeduction', label: 'Show Advance Repayment Row' },
              { key: 'showLoanDeduction', label: 'Show Loan Deduction Row' },
            ].map(item => (
              <label
                key={item.key}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                onClick={() => handleToggle(item.key as keyof SalarySlipLayoutConfig)}
              >
                {config[item.key as keyof SalarySlipLayoutConfig] ? <CheckSquare size={16} color="#06b6d4" /> : <Square size={16} color="#94a3b8" />}
                {item.label}
              </label>
            ))}
          </div>
        </div>

        {/* CUSTOM EARNINGS SECTION */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} style={{ color: '#06b6d4' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Custom Earning Components</h3>
            </div>
            <button
              type="button"
              onClick={() => addCustomItem('customEarnings')}
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.3rem' }}
            >
              <Plus size={14} /> Add Custom Earning
            </button>
          </div>

          {(config.customEarnings || []).length === 0 ? (
            <p className="text-sm text-muted">No custom earning rows added yet. Click &quot;Add Custom Earning&quot; above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {config.customEarnings!.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => updateCustomItem('customEarnings', item.id, 'enabled', !item.enabled)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {item.enabled ? <CheckSquare size={18} color="#06b6d4" /> : <Square size={18} color="#94a3b8" />}
                  </button>

                  <input
                    type="text"
                    className="form-input"
                    value={item.name}
                    placeholder="Earning Name (e.g. Special Allowance)"
                    onChange={(e) => updateCustomItem('customEarnings', item.id, 'name', e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', width: '90px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>₹</span>
                    <input
                      type="number"
                      className="form-input"
                      value={item.defaultValue === 0 ? '' : item.defaultValue}
                      placeholder="0"
                      onChange={(e) => updateCustomItem('customEarnings', item.id, 'defaultValue', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCustomItem('customEarnings', item.id)}
                    className="btn btn-ghost"
                    style={{ color: '#ef4444', padding: '0.3rem' }}
                    title="Remove custom line"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CUSTOM DEDUCTIONS SECTION */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} style={{ color: '#ef4444' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Custom Deduction Components</h3>
            </div>
            <button
              type="button"
              onClick={() => addCustomItem('customDeductions')}
              className="btn btn-secondary btn-sm"
              style={{ gap: '0.3rem' }}
            >
              <Plus size={14} /> Add Custom Deduction
            </button>
          </div>

          {(config.customDeductions || []).length === 0 ? (
            <p className="text-sm text-muted">No custom deduction rows added yet. Click &quot;Add Custom Deduction&quot; above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {config.customDeductions!.map((item) => (
                <div key={item.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => updateCustomItem('customDeductions', item.id, 'enabled', !item.enabled)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {item.enabled ? <CheckSquare size={18} color="#ef4444" /> : <Square size={18} color="#94a3b8" />}
                  </button>

                  <input
                    type="text"
                    className="form-input"
                    value={item.name}
                    placeholder="Deduction Name (e.g. TDS / Tax)"
                    onChange={(e) => updateCustomItem('customDeductions', item.id, 'name', e.target.value)}
                    style={{ flex: 1, padding: '0.4rem 0.6rem', fontSize: '0.8125rem' }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', width: '90px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>₹</span>
                    <input
                      type="number"
                      className="form-input"
                      value={item.defaultValue === 0 ? '' : item.defaultValue}
                      placeholder="0"
                      onChange={(e) => updateCustomItem('customDeductions', item.id, 'defaultValue', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      style={{ width: '100%', padding: '0.4rem 0.5rem', fontSize: '0.8125rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeCustomItem('customDeductions', item.id)}
                    className="btn btn-ghost"
                    style={{ color: '#ef4444', padding: '0.3rem' }}
                    title="Remove custom line"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Signature Block Customization */}
        <div className="glass-card-static">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <PenTool size={18} style={{ color: '#8b5cf6' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Signature Block Settings</h3>
          </div>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1rem' }}
            onClick={() => handleToggle('showSignatures')}
          >
            {config.showSignatures ? <CheckSquare size={18} color="#06b6d4" /> : <Square size={18} color="#94a3b8" />}
            Include 4 Signature Lines at Bottom
          </label>

          {config.showSignatures && (
            <div className="grid-2" style={{ gap: '0.75rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Signatory 1</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.sig1Label}
                  onChange={(e) => handleChange('sig1Label', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Signatory 2</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.sig2Label}
                  onChange={(e) => handleChange('sig2Label', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Signatory 3</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.sig3Label}
                  onChange={(e) => handleChange('sig3Label', e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Signatory 4</label>
                <input
                  type="text"
                  className="form-input"
                  value={config.sig4Label}
                  onChange={(e) => handleChange('sig4Label', e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Note Text */}
        <div className="glass-card-static">
          <label className="form-label" style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Footer Note Text
          </label>
          <textarea
            className="form-textarea"
            rows={2}
            value={config.noteText}
            onChange={(e) => handleChange('noteText', e.target.value)}
            placeholder="This is a computer-generated salary slip..."
          />
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={saving} style={{ width: '100%' }}>
          <Save size={18} />
          {saving ? 'Saving Template...' : 'Save Salary Slip Template'}
        </button>
      </form>

      {/* RIGHT PANEL: Live Interactive Visual Salary Slip Preview */}
      <div style={{ position: 'sticky', top: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          padding: '0 0.25rem'
        }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            📄 Live Layout Preview (A4 Page Document)
          </span>
          <span style={{ fontSize: '0.75rem', color: '#06b6d4', fontWeight: 600 }}>
            Real-time Updates
          </span>
        </div>

        <div style={{
          background: '#ffffff',
          color: '#111111',
          padding: '24px 28px',
          borderRadius: '8px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          fontFamily: 'Helvetica, Arial, sans-serif',
          fontSize: '11px',
          border: '1px solid #cbd5e1',
          maxHeight: '82vh',
          overflowY: 'auto'
        }}>
          {/* Header Banner */}
          {config.showHeaderLogo ? (
            <div style={{ margin: '-24px -28px 14px -28px' }}>
              <img src="/header.png" alt="Header Banner" style={{ width: '100%', height: 'auto', display: 'block', borderTopLeftRadius: '7px', borderTopRightRadius: '7px' }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#123B6D', letterSpacing: '1px' }}>
                {config.companyName || 'MY PAIN CLINIC GLOBAL'}
              </h2>
            </div>
          )}

          <h3 style={{ textAlign: 'center', fontSize: '15px', fontWeight: 700, margin: '8px 0 12px', color: '#111111' }}>
            {config.slipTitle || 'SALARY SLIP'}
          </h3>

          {/* Employee Details Grid */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', border: '1px solid #777' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #777' }}>
                <td style={{ width: '20%', padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Employee Name</td>
                <td style={{ width: '30%', padding: '6px', borderRight: '1px solid #777' }}>Rahul Sharma</td>
                <td style={{ width: '20%', padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Month & Year</td>
                <td style={{ width: '30%', padding: '6px' }}>August 2026</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #777' }}>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Employee ID</td>
                <td style={{ padding: '6px', borderRight: '1px solid #777' }}>MPC-080</td>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>PAN No.</td>
                <td style={{ padding: '6px' }}>ABCDE1234F</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #777' }}>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Designation</td>
                <td style={{ padding: '6px', borderRight: '1px solid #777' }}>Senior Physiotherapist</td>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Department</td>
                <td style={{ padding: '6px' }}>Clinical</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #777' }}>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Date of Joining</td>
                <td style={{ padding: '6px', borderRight: '1px solid #777' }}>15/01/2024</td>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Initial Salary (Fixed)</td>
                <td style={{ padding: '6px' }}>Rs. 38,700.00</td>
              </tr>
              <tr>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Bank Name &amp; A/C</td>
                <td style={{ padding: '6px', borderRight: '1px solid #777' }}>HDFC Bank - 46457547567354</td>
                <td style={{ padding: '6px', fontWeight: 'bold', background: '#f3f4f6', borderRight: '1px solid #777' }}>Paid / LOP Days</td>
                <td style={{ padding: '6px' }}>31.0 Days / 0.0 LOP</td>
              </tr>
            </tbody>
          </table>

          {/* Earnings & Deductions Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #777' }}>
            <thead>
              <tr style={{ background: '#123B6D', color: '#ffffff', textAlign: 'center', fontWeight: 'bold' }}>
                <td colSpan={2} style={{ padding: '7px', borderRight: '1px solid #777', width: '50%' }}>EARNINGS</td>
                <td colSpan={2} style={{ padding: '7px', width: '50%' }}>DEDUCTIONS</td>
              </tr>
              <tr style={{ background: '#EAF0F7', fontWeight: 'bold', borderBottom: '1px solid #777' }}>
                <td style={{ padding: '6px', width: '32%', borderRight: '1px solid #777' }}>PARTICULARS</td>
                <td style={{ padding: '6px', width: '18%', textAlign: 'right', borderRight: '1px solid #777' }}>AMOUNT (Rs.)</td>
                <td style={{ padding: '6px', width: '32%', borderRight: '1px solid #777' }}>PARTICULARS</td>
                <td style={{ padding: '6px', width: '18%', textAlign: 'right' }}>AMOUNT (Rs.)</td>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>Basic Salary</td>
                <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777' }}>35,000.00</td>
                <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>
                  {config.showAdvanceDeduction ? 'Advance Repayment' : config.showLoanDeduction ? 'Loan Deduction' : '—'}
                </td>
                <td style={{ padding: '5px 6px', textAlign: 'right' }}>0.00</td>
              </tr>

              {config.showHra && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>HRA</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777' }}>0.00</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>
                    {config.showLoanDeduction ? 'Loan Deduction' : '—'}
                  </td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }}>0.00</td>
                </tr>
              )}

              {config.showConveyance && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>Conveyance Allowance</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777' }}>0.00</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }}>—</td>
                </tr>
              )}

              {config.showIncentive && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>Performance Incentive</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777' }}>2,500.00</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }}>—</td>
                </tr>
              )}

              {config.showOvertime && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>Overtime Earnings</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777' }}>1,200.00</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }}>—</td>
                </tr>
              )}

              {/* Render custom earnings */}
              {enabledCustomEarnings.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777', color: '#111111' }}>{item.name || 'Custom Earning'}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777', color: '#111111' }}>{(item.defaultValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }}>—</td>
                </tr>
              ))}

              {config.showPfDeduction && (
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>PF Deduction</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right' }}>0.00</td>
                </tr>
              )}

              {/* Render custom deductions */}
              {enabledCustomDeductions.map((item) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', borderRight: '1px solid #777' }}>—</td>
                  <td style={{ padding: '5px 6px', borderRight: '1px solid #777', color: '#111111' }}>{item.name || 'Custom Deduction'}</td>
                  <td style={{ padding: '5px 6px', textAlign: 'right', color: '#111111' }}>{(item.defaultValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}

              <tr style={{ background: '#F1F1F1', fontWeight: 'bold', borderTop: '1px solid #777' }}>
                <td style={{ padding: '6px', borderRight: '1px solid #777' }}>GROSS SALARY</td>
                <td style={{ padding: '6px', textAlign: 'right', borderRight: '1px solid #777' }}>{sampleGross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ padding: '6px', borderRight: '1px solid #777' }}>TOTAL DEDUCTION</td>
                <td style={{ padding: '6px', textAlign: 'right' }}>{sampleTotalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>

          {/* Net Salary Payable Box */}
          <div style={{
            marginTop: '10px',
            border: '1px solid #777',
            padding: '6px 10px',
            textAlign: 'center',
            background: '#fafafa',
            borderRadius: '4px'
          }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#111', letterSpacing: '0.5px' }}>
              NET SALARY PAYABLE
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#123B6D', marginTop: '2px' }}>
              Rs. {sampleNet.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ marginTop: '3px', fontSize: '9.5px', color: '#444', fontStyle: 'italic' }}>
              Amount in Words: (Calculated dynamically on download)
            </div>
          </div>

          {/* Signatures */}
          {config.showSignatures && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '35px', textAlign: 'center' }}>
              <div style={{ width: '22%' }}>
                <div style={{ borderTop: '1px solid #555', paddingTop: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  {config.sig1Label || 'Employee Signature'}
                </div>
              </div>
              <div style={{ width: '22%' }}>
                <div style={{ borderTop: '1px solid #555', paddingTop: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  {config.sig2Label || 'Prepared By'}
                </div>
              </div>
              <div style={{ width: '22%' }}>
                <div style={{ borderTop: '1px solid #555', paddingTop: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  {config.sig3Label || 'Checked By'}
                </div>
              </div>
              <div style={{ width: '22%' }}>
                <div style={{ borderTop: '1px solid #555', paddingTop: '4px', fontSize: '10px', fontWeight: 'bold' }}>
                  {config.sig4Label || 'Authorized Signature'}
                </div>
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div style={{ marginTop: '16px', fontSize: '9.5px', color: '#555', borderTop: '1px solid #e2e8f0', paddingTop: '8px' }}>
            {config.noteText || 'Note: This is a computer-generated salary slip. PF is not included in this salary structure.'}
          </div>
        </div>
      </div>
    </div>
  );
}
