import { getSalarySlipLayoutConfig } from '@/actions/salary-slip-config';
import SalarySlipDesignerForm from './SalarySlipDesignerForm';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function SalarySlipLayoutPage() {
  const config = await getSalarySlipLayoutConfig();

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/dashboard/settings" className="btn btn-ghost btn-icon" style={{ textDecoration: 'none' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">Salary Slip Template Designer</h1>
            <p className="page-subtitle">
              Customize company headers, title branding, earnings/deductions rows, signature blocks & footer notices
            </p>
          </div>
        </div>
      </div>

      <SalarySlipDesignerForm initialConfig={config} />
    </div>
  );
}
