'use client';

import { useRouter, useSearchParams } from 'next/navigation';

type SimpleEmployee = { id: string; name: string; employeeId: string };

export default function AttendanceFilters({
  employees = [],
  defaultMonth,
  defaultYear,
}: {
  employees?: SimpleEmployee[];
  defaultMonth?: number;
  defaultYear?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  const activeMonth = searchParams.get('month') || String(defaultMonth || now.getMonth() + 1);
  const activeYear = searchParams.get('year') || String(defaultYear || now.getFullYear());
  const activeEmployee = searchParams.get('employeeId') || '';

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (key === 'month' || key === 'year') {
      // Clear specific single-date filter when selecting month/year range
      params.delete('date');

      if (key === 'month') {
        if (value) {
          params.set('month', value);
          if (!params.get('year')) {
            params.set('year', activeYear);
          }
        } else {
          params.delete('month');
        }
      }

      if (key === 'year') {
        if (value) {
          params.set('year', value);
          if (!params.get('month')) {
            params.set('month', activeMonth);
          }
        } else {
          params.delete('year');
        }
      }
    } else if (key === 'date') {
      if (value) {
        params.set('date', value);
      } else {
        params.delete('date');
      }
    } else {
      if (value) params.set(key, value);
      else params.delete(key);
    }

    router.push(`/dashboard/attendance?${params.toString()}`);
  };

  return (
    <div className="filter-bar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <select
          className="form-select"
          style={{ minWidth: '220px' }}
          value={activeEmployee}
          onChange={(e) => handleFilter('employeeId', e.target.value)}
        >
          <option value="">All Employees</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.name} ({emp.employeeId})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <select
          className="form-select"
          style={{ width: '130px' }}
          value={activeMonth}
          onChange={(e) => handleFilter('month', e.target.value)}
        >
          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <select
          className="form-select"
          style={{ width: '110px' }}
          value={activeYear}
          onChange={(e) => handleFilter('year', e.target.value)}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginBottom: 0 }}>
        <input
          type="date"
          className="form-input"
          style={{ width: '170px' }}
          value={searchParams.get('date') || ''}
          onChange={(e) => handleFilter('date', e.target.value)}
        />
      </div>

      {activeEmployee && (
        <button
          onClick={() => handleFilter('employeeId', '')}
          className="btn btn-secondary btn-sm"
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
        >
          Clear Employee Filter
        </button>
      )}

      <button
        onClick={async () => {
          const { syncRealtimeCloudPunches } = await import('@/actions/realtime-cloud-sync');
          const res = await syncRealtimeCloudPunches();
          alert(res.message);
          router.refresh();
        }}
        className="btn btn-primary btn-sm"
        style={{ gap: '0.4rem', backgroundColor: '#0284c7', borderColor: '#0284c7' }}
        title="Sync punches from Realsoft Cloud (http://realsoftcloud.com:85)"
      >
        📡 Sync Realtime Cloud
      </button>
    </div>
  );
}

