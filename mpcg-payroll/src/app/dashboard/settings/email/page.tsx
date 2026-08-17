import { getSMTPSettings } from '@/lib/email';
import SMTPSettingsForm from './SMTPSettingsForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function SMTPSettingsPage() {
  const config = await getSMTPSettings();

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/dashboard/settings"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '0.75rem' }}
        >
          <ArrowLeft size={16} /> Back to Settings
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Email / SMTP Settings
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Configure SMTP server credentials to enable bulk and individual salary slip email delivery.
        </p>
      </div>

      <SMTPSettingsForm initialConfig={config} />
    </div>
  );
}
