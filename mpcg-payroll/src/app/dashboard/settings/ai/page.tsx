import { getAISettings } from '@/lib/ai-service';
import AISettingsForm from './AISettingsForm';
import { Bot, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'AI Salary Engine Settings | MPCG Payroll',
};

export default async function AISettingsPage() {
  const initialSettings = await getAISettings();

  return (
    <div className="container" style={{ padding: '1.5rem 0', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          href="/dashboard/settings"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.875rem',
            color: 'var(--text-secondary, #6B7280)',
            textDecoration: 'none',
            marginBottom: '0.75rem',
          }}
        >
          <ArrowLeft size={16} /> Back to Settings
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              padding: '10px',
              borderRadius: '12px',
              backgroundColor: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={28} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>AI Salary & Payroll Engine</h1>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary, #6B7280)', fontSize: '0.9rem' }}>
              Configure free, ultra-fast LLM engines (Groq, OpenRouter, NVIDIA NIM) for AI salary calculations, anomaly auditing, and interactive Q&A.
            </p>
          </div>
        </div>
      </div>

      <AISettingsForm initialSettings={initialSettings} />
    </div>
  );
}
