'use client';

import { useRouter } from 'next/navigation';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export default function SalarySlipFilters({ month, year }: { month: number; year: number }) {
  const router = useRouter();

  const updateUrl = (m: number, y: number) => {
    router.push(`/dashboard/salary-slips?month=${m}&year=${y}`);
  };

  return (
    <div className="flex-gap" style={{ alignItems: 'center' }}>
      <select
        className="form-select"
        style={{ width: '130px' }}
        value={month}
        onChange={(e) => updateUrl(parseInt(e.target.value), year)}
      >
        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        className="form-select"
        style={{ width: '100px' }}
        value={year}
        onChange={(e) => updateUrl(month, parseInt(e.target.value))}
      >
        {[2024, 2025, 2026, 2027].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <Link
        href="/dashboard/settings/salary-slip-layout"
        className="btn btn-secondary btn-sm"
        style={{ gap: '0.4rem', textDecoration: 'none' }}
      >
        <Settings size={14} />
        Customize Template Layout
      </Link>
    </div>
  );
}
