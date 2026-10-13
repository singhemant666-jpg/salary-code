'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Download, Search, Calendar } from 'lucide-react';
import { useState } from 'react';

interface AvailablePeriod {
  year: number;
  month: number;
  count: number;
}

export default function ReportsControls({
  currentMonth,
  currentYear,
  availablePeriods = [],
  onSearchChange,
}: {
  currentMonth: number;
  currentYear: number;
  availablePeriods?: AvailablePeriod[];
  onSearchChange?: (val: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [downloading, setDownloading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePeriodChange = (month: number, year: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', String(month));
    params.set('year', String(year));
    router.push(`/dashboard/reports?${params.toString()}`);
  };

  const handleSearch = (val: string) => {
    setSearchTerm(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const handleExport = () => {
    setDownloading(true);
    const exportUrl = `/api/payroll/export-excel?month=${currentMonth}&year=${currentYear}`;
    
    // Trigger download
    const link = document.createElement('a');
    link.href = exportUrl;
    link.download = `MPCG_Payroll_Report_${months[currentMonth - 1]}_${currentYear}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloading(false);
    }, 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Month & Year Selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={18} style={{ color: '#06b6d4' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Period:</span>
          </div>

          <select
            className="form-select"
            style={{ width: '140px', padding: '0.5rem 0.75rem' }}
            value={currentMonth}
            onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10), currentYear)}
          >
            {months.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ width: '100px', padding: '0.5rem 0.75rem' }}
            value={currentYear}
            onChange={(e) => handlePeriodChange(currentMonth, parseInt(e.target.value, 10))}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Quick links to periods that have data */}
          {availablePeriods.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Available:</span>
              {availablePeriods.slice(0, 3).map((p) => {
                const isSelected = p.month === currentMonth && p.year === currentYear;
                return (
                  <button
                    key={`${p.year}-${p.month}`}
                    onClick={() => handlePeriodChange(p.month, p.year)}
                    className="btn btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? 'rgba(6, 182, 212, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      border: isSelected ? '1px solid #06b6d4' : '1px solid rgba(255, 255, 255, 0.1)',
                      color: isSelected ? '#06b6d4' : 'var(--text-secondary)',
                      cursor: 'pointer',
                    }}
                  >
                    {months[p.month - 1].slice(0, 3)} {p.year} ({p.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons: Export to Excel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={handleExport}
            disabled={downloading}
            className="btn"
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              border: 'none',
              padding: '0.55rem 1.25rem',
              borderRadius: '8px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: downloading ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.35)',
              transition: 'all 0.2s ease',
            }}
          >
            <FileSpreadsheet size={18} />
            {downloading ? 'Generating Excel...' : 'Export Excel Report (.xlsx)'}
            <Download size={15} style={{ opacity: 0.8 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
