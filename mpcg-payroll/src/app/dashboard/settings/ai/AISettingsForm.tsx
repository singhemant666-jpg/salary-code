'use client';

import { useState, useEffect } from 'react';
import { AISettings, DEFAULT_AI_PROVIDERS } from '@/lib/ai-service';
import { saveAISettingsAction, testAIConnectionAction, fetchAvailableAIModelsAction } from '@/actions/ai';
import {
  Bot,
  Zap,
  Key,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Save,
  Activity,
  ExternalLink,
  Info,
  Layers,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react';

export default function AISettingsForm({ initialSettings }: { initialSettings: AISettings }) {
  const [settings, setSettings] = useState<AISettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [liveModels, setLiveModels] = useState<Array<{ id: string; name: string }>>([]);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);

  const selectedProviderMeta = DEFAULT_AI_PROVIDERS[settings.provider] || DEFAULT_AI_PROVIDERS.groq;

  const handleProviderSelect = (prov: AISettings['provider']) => {
    const meta = DEFAULT_AI_PROVIDERS[prov];
    setSettings((prev) => ({
      ...prev,
      provider: prov,
      baseUrl: meta.baseUrl,
      model: meta.defaultModel,
    }));
    setLiveModels([]);
    setTestResult(null);
  };

  const handleFetchLiveModels = async () => {
    if (!settings.apiKey && settings.provider !== 'custom') return;
    setFetchingModels(true);
    const res = await fetchAvailableAIModelsAction(settings);
    if (res.success && res.models.length > 0) {
      setLiveModels(res.models);
    }
    setFetchingModels(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    const res = await saveAISettingsAction(settings);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testAIConnectionAction(settings);
    setTestResult(res);
    setTesting(false);
  };

  return (
    <div style={{ maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {statusMessage && (
        <div
          style={{
            padding: '1rem 1.25rem',
            borderRadius: '12px',
            backgroundColor: statusMessage.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1px solid ${statusMessage.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: statusMessage.type === 'success' ? '#065F46' : '#991B1B',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 500,
          }}
        >
          {statusMessage.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          {statusMessage.text}
        </div>
      )}

      {/* Provider Selector Cards */}
      <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-card, #ffffff)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: '10px',
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>1. Choose Free AI Engine</h3>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #6B7280)' }}>
              Select a free, high-speed LLM provider for instant salary explanations and full payroll auditing.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          {(Object.keys(DEFAULT_AI_PROVIDERS) as Array<keyof typeof DEFAULT_AI_PROVIDERS>).map((key) => {
            const isSelected = settings.provider === key;
            const meta = DEFAULT_AI_PROVIDERS[key];
            return (
              <div
                key={key}
                onClick={() => handleProviderSelect(key)}
                style={{
                  padding: '1.25rem',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #4F46E5' : '1px solid var(--border-color, #E5E7EB)',
                  backgroundColor: isSelected ? '#F5F3FF' : 'var(--surface-ground, #F9FAFB)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#4F46E5',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <div style={{ fontWeight: 700, fontSize: '1rem', color: isSelected ? '#4338CA' : 'inherit', marginBottom: '0.25rem' }}>
                  {key.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6B7280)', lineHeight: '1.3' }}>
                  {meta.name}
                </div>
              </div>
            );
          })}
        </div>

        {selectedProviderMeta.getKeyUrl && (
          <div
            style={{
              marginTop: '1.25rem',
              padding: '0.85rem 1rem',
              backgroundColor: '#EFF6FF',
              borderRadius: '8px',
              border: '1px solid #BFDBFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.875rem',
              color: '#1E40AF',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} />
              <span>
                Get your 100% Free <strong>{settings.provider.toUpperCase()}</strong> API Key:
              </span>
            </div>
            <a
              href={selectedProviderMeta.getKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: '#2563EB',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Get Free Key <ExternalLink size={14} />
            </a>
          </div>
        )}
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="card" style={{ padding: '1.5rem', backgroundColor: 'var(--surface-card, #ffffff)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '10px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Key size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600 }}>2. Credentials & Model Selection</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #6B7280)' }}>
                Configure API Key and select your preferred intelligence model.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Enable AI Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem',
                backgroundColor: 'var(--surface-ground, #F9FAFB)',
                borderRadius: '10px',
                border: '1px solid var(--border-color, #E5E7EB)',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Enable AI Salary Assistant & Audit</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #6B7280)' }}>
                  Activates 1-click AI audit buttons and automated salary explanations across the app.
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', margin: 0, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings((prev) => ({ ...prev, enabled: e.target.checked }))}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span
                  style={{
                    position: 'absolute',
                    cursor: 'pointer',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: settings.enabled ? '#4F46E5' : '#D1D5DB',
                    transition: '0.3s',
                    borderRadius: '26px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      content: '""',
                      height: '20px',
                      width: '20px',
                      left: settings.enabled ? '25px' : '3px',
                      bottom: '3px',
                      backgroundColor: 'white',
                      transition: '0.3s',
                      borderRadius: '50%',
                    }}
                  />
                </span>
              </label>
            </div>

            {/* API Key */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                {settings.provider.toUpperCase()} API Key {settings.provider !== 'custom' && <span style={{ color: '#EF4444' }}>*</span>}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder={`Enter your ${settings.provider.toUpperCase()} API Key (e.g. gsk_...)`}
                  value={settings.apiKey}
                  onChange={(e) => setSettings((prev) => ({ ...prev, apiKey: e.target.value }))}
                  style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #6B7280)', marginTop: '0.25rem' }}>
                Your API key is encrypted and stored safely on your private server.
              </p>
            </div>

            {/* Model Selector */}
            <div className="grid-2" style={{ gap: '1rem' }}>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                    {liveModels.length > 0 ? `Active Models (${liveModels.length})` : 'Recommended Models'}
                  </label>
                  {settings.apiKey && (
                    <button
                      type="button"
                      onClick={handleFetchLiveModels}
                      disabled={fetchingModels}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#4F46E5',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: 0,
                      }}
                    >
                      <RefreshCw size={12} className={fetchingModels ? 'animate-spin' : ''} />
                      {fetchingModels ? 'Loading...' : 'Load Live Models'}
                    </button>
                  )}
                </div>
                <select
                  className="form-select"
                  value={settings.model}
                  onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
                >
                  {(liveModels.length > 0 ? liveModels : selectedProviderMeta.popularModels).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Selected Model ID
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. llama-3.3-70b-versatile"
                  value={settings.model}
                  onChange={(e) => setSettings((prev) => ({ ...prev, model: e.target.value }))}
                />
              </div>
            </div>

            {/* Endpoint Base URL */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                API Base URL
              </label>
              <input
                type="text"
                className="form-input"
                value={settings.baseUrl || selectedProviderMeta.baseUrl}
                onChange={(e) => setSettings((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder={selectedProviderMeta.baseUrl}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons & Live Test Widget */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.5rem',
            backgroundColor: 'var(--surface-card, #ffffff)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || (!settings.apiKey && settings.provider !== 'custom')}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem' }}
            >
              <Activity size={16} className={testing ? 'animate-spin' : ''} />
              {testing ? 'Testing Connection...' : '⚡ Test Connection'}
            </button>

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.5rem', fontWeight: 600 }}
            >
              <Save size={16} />
              {saving ? 'Saving Settings...' : 'Save AI Settings'}
            </button>
          </div>

          {testResult && (
            <div
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                backgroundColor: testResult.success ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${testResult.success ? '#10B981' : '#EF4444'}`,
                color: testResult.success ? '#065F46' : '#991B1B',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              {testResult.success ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <span>{testResult.message}</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
