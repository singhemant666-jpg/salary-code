import { getWhatsAppSettings } from '@/lib/whatsapp';
import WhatsAppSettingsForm from './WhatsAppSettingsForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function WhatsAppSettingsPage() {
  const config = await getWhatsAppSettings();

  return (
    <div className="animate-fade-in" style={{ padding: '1.5rem 0' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/dashboard/settings/salary-slip-layout"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', marginBottom: '0.75rem' }}
        >
          <ArrowLeft size={16} /> Back to Template Settings
        </Link>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          WhatsApp Notifications (Gupshup API)
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          Configure Gupshup WhatsApp API credentials to send automated Login &amp; Logout alerts to employee mobile numbers.
        </p>
      </div>

      <WhatsAppSettingsForm initialConfig={config} />
    </div>
  );
}
