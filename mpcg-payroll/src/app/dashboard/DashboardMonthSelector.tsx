'use client';

import { useRouter } from 'next/navigation';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface DashboardMonthSelectorProps {
  selectedMonth: number;
  selectedYear: number;
  availablePeriods?: Array<{ month: number; year: number; count: number }>;
}

export default function DashboardMonthSelector({
  selectedMonth,
  selectedYear,
  availablePeriods = [],
}: DashboardMonthSelectorProps) {
  const router = useRouter();

  const handlePeriodChange = (month: number, year: number) => {
    router.push(`/dashboard?month=${month}&year=${year}`);
  };

  const handlePrevMonth = () => {
    let m = selectedMonth - 1;
    let y = selectedYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    handlePeriodChange(m, y);
  };

  const handleNextMonth = () => {
    let m = selectedMonth + 1;
    let y = selectedYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    handlePeriodChange(m, y);
  };

  const hasData = availablePeriods.some(
    p => p.month === selectedMonth && p.year === selectedYear && p.count > 0
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        background: 'var(--bg-glass)',
        padding: '0.35rem 0.6rem',
        borderRadius: '10px',
        border: '1px solid var(--border-primary)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#06b6d4', padding: '0 0.25rem' }}>
        <Calendar size={16} />
        <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Period:
        </span>
      </div>

      {/* Prev Month Button */}
      <button
        type="button"
        onClick={handlePrevMonth}
        title="Previous Month"
        className="btn btn-ghost"
        style={{
          padding: '0.25rem 0.35rem',
          minWidth: 'auto',
          height: '28px',
          borderRadius: '6px',
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Month Dropdown */}
      <select
        value={selectedMonth}
        onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10), selectedYear)}
        className="form-select"
        style={{
          padding: '0.25rem 0.55rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          height: '32px',
          width: 'auto',
          minWidth: '125px',
          background: 'rgba(15, 23, 42, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        {MONTH_NAMES.map((name, idx) => {
          const m = idx + 1;
          const periodData = availablePeriods.find(p => p.month === m && p.year === selectedYear);
          return (
            <option key={m} value={m}>
              {name} {periodData ? `(${periodData.count} processed)` : ''}
            </option>
          );
        })}
      </select>

      {/* Year Dropdown */}
      <select
        value={selectedYear}
        onChange={(e) => handlePeriodChange(selectedMonth, parseInt(e.target.value, 10))}
        className="form-select"
        style={{
          padding: '0.25rem 0.55rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          height: '32px',
          width: 'auto',
          background: 'rgba(15, 23, 42, 0.6)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        {[2024, 2025, 2026, 2027].map((yr) => (
          <option key={yr} value={yr}>
            {yr}
          </option>
        ))}
      </select>

      {/* Next Month Button */}
      <button
        type="button"
        onClick={handleNextMonth}
        title="Next Month"
        className="btn btn-ghost"
        style={{
          padding: '0.25rem 0.35rem',
          minWidth: 'auto',
          height: '28px',
          borderRadius: '6px',
        }}
      >
        <ChevronRight size={16} />
      </button>

      {/* Status Pill Indicator */}
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          padding: '0.15rem 0.5rem',
          borderRadius: '12px',
          marginLeft: '0.25rem',
          background: hasData ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
          color: hasData ? '#4ade80' : '#fbbf24',
          border: hasData ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
        }}
      >
        {hasData ? 'Active Data' : 'No Records'}
      </span>
    </div>
  );
}
