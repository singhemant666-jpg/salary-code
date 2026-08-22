'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateEmployeePayroll } from '@/actions/payroll';
import { RefreshCw } from 'lucide-react';

interface RecalculateButtonProps {
  payrollId: string;
  isFinal: boolean;
}

export default function RecalculateButton({ payrollId, isFinal }: RecalculateButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRecalculate = async () => {
    if (isFinal) {
      if (!confirm('Recalculate this payroll? Status will reset to CALCULATED and any existing salary slip will be deleted.')) {
        return;
      }
    }

    setLoading(true);
    try {
      const result = await calculateEmployeePayroll(payrollId);
      if (result.success) {
        alert('Payroll recalculated successfully');
      } else {
        alert(result.message || 'Failed to recalculate payroll');
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    } finally {
      router.refresh();
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRecalculate}
      className={`btn btn-sm ${isFinal ? 'btn-ghost text-warning' : 'btn-ghost text-primary'}`}
      disabled={loading}
      title={isFinal ? 'Recalculate (Finalized)' : 'Calculate'}
      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', border: 'none', background: 'transparent' }}
    >
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
      {loading ? 'Calculating...' : isFinal ? 'Recalculate' : 'Calculate'}
    </button>
  );
}
