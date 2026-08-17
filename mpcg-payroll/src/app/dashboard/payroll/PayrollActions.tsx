'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createPayrollPeriod,
  calculateAllPayrolls,
  approveAllPayrolls,
  generateAllSalarySlips,
} from '@/actions/payroll';
import { Plus, Calculator, CheckCircle, FileText } from 'lucide-react';

export default function PayrollActions({ month, year }: { month: number; year: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');

  const handleAction = async (action: string) => {
    setLoading(action);
    let result;
    
    switch (action) {
      case 'create':
        result = await createPayrollPeriod(month, year);
        break;
      case 'calculate':
        result = await calculateAllPayrolls(month, year);
        break;
      case 'approve':
        if (!confirm('Approve all calculated payrolls?')) { setLoading(''); return; }
        result = await approveAllPayrolls(month, year);
        break;
      case 'generate':
        if (!confirm('Finalize payrolls & generate salary slips for all employees?')) { setLoading(''); return; }
        result = await generateAllSalarySlips(month, year);
        break;
    }

    if (result) {
      alert(result.message);
    }
    router.refresh();
    setLoading('');
  };

  const handleMonthChange = (newMonth: number, newYear: number) => {
    router.push(`/dashboard/payroll?month=${newMonth}&year=${newYear}`);
  };

  return (
    <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
      <select
        className="form-select"
        style={{ width: '130px' }}
        value={month}
        onChange={(e) => handleMonthChange(parseInt(e.target.value), year)}
      >
        {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
          <option key={i} value={i + 1}>{m}</option>
        ))}
      </select>

      <select
        className="form-select"
        style={{ width: '100px' }}
        value={year}
        onChange={(e) => handleMonthChange(month, parseInt(e.target.value))}
      >
        {[2024, 2025, 2026, 2027].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>

      <button
        onClick={() => handleAction('create')}
        className="btn btn-secondary btn-sm"
        disabled={!!loading}
      >
        <Plus size={14} />
        {loading === 'create' ? 'Creating...' : 'Create Period'}
      </button>

      <button
        onClick={() => handleAction('calculate')}
        className="btn btn-primary btn-sm"
        disabled={!!loading}
      >
        <Calculator size={14} />
        {loading === 'calculate' ? 'Calculating...' : 'Calculate All'}
      </button>

      <button
        onClick={() => handleAction('approve')}
        className="btn btn-success btn-sm"
        disabled={!!loading}
      >
        <CheckCircle size={14} />
        {loading === 'approve' ? 'Approving...' : 'Approve All'}
      </button>

      <button
        onClick={() => handleAction('generate')}
        className="btn btn-primary btn-sm"
        style={{ backgroundColor: '#06b6d4' }}
        disabled={!!loading}
      >
        <FileText size={14} />
        {loading === 'generate' ? 'Generating...' : 'Generate All Slips'}
      </button>
    </div>
  );
}
