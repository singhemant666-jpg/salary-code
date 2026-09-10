'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { calculateEmployeePayroll, approvePayroll, finalizePayroll } from '@/actions/payroll';
import { sendSalarySlipWhatsAppAPI } from '@/actions/salary-slip-whatsapp';
import { Calculator, CheckCircle, Lock, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function PayrollDetailActions({ payrollId, status }: { payrollId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState('');

  const handleAction = async (action: string) => {
    setLoading(action);
    let result;
    
    switch (action) {
      case 'calculate':
        result = await calculateEmployeePayroll(payrollId);
        break;
      case 'approve':
        result = await approvePayroll(payrollId);
        break;
      case 'finalize':
        if (!confirm('Finalize this payroll? It cannot be modified after finalization.')) {
          setLoading('');
          return;
        }
        result = await finalizePayroll(payrollId);
        break;
    }

    if (result) alert(result.message);
    router.refresh();
    setLoading('');
  };

  const handleWhatsApp = async () => {
    setLoading('whatsapp');
    const res = await sendSalarySlipWhatsAppAPI(payrollId, window.location.origin);
    if (res.whatsappUrl) {
      window.open(res.whatsappUrl, '_blank');
    }
    alert(res.message);
    setLoading('');
  };

  const isFinal = status === 'FINALIZED' || status === 'SALARY_SLIP_GENERATED';

  return (
    <div className="flex-gap">
      {isFinal ? (
        <button
          onClick={() => {
            if (confirm('Recalculate this payroll? The status will reset to CALCULATED and any existing salary slip will be deleted.')) {
              handleAction('calculate');
            }
          }}
          className="btn btn-warning btn-sm"
          disabled={!!loading}
        >
          <Calculator size={14} />
          {loading === 'calculate' ? 'Recalculating...' : 'Recalculate'}
        </button>
      ) : (
        <button
          onClick={() => handleAction('calculate')}
          className="btn btn-primary btn-sm"
          disabled={!!loading}
        >
          <Calculator size={14} />
          {loading === 'calculate' ? 'Calculating...' : 'Calculate'}
        </button>
      )}

      {(status === 'CALCULATED' || status === 'UNDER_REVIEW') && (
        <button
          onClick={() => handleAction('approve')}
          className="btn btn-success btn-sm"
          disabled={!!loading}
        >
          <CheckCircle size={14} />
          Approve
        </button>
      )}

      {status === 'APPROVED' && (
        <button
          onClick={() => handleAction('finalize')}
          className="btn btn-secondary btn-sm"
          disabled={!!loading}
        >
          <Lock size={14} />
          Finalize
        </button>
      )}

      {(status === 'FINALIZED' || status === 'APPROVED' || status === 'SALARY_SLIP_GENERATED') && (
        <>
          <button
            onClick={handleWhatsApp}
            className="btn btn-secondary btn-sm"
            style={{ borderColor: '#22c55e', color: '#16a34a' }}
            disabled={!!loading}
          >
            <MessageSquare size={14} style={{ color: '#22c55e' }} />
            {loading === 'whatsapp' ? 'Opening WhatsApp...' : 'Send WhatsApp'}
          </button>

          <Link
            href={`/api/salary-slip/${payrollId}`}
            className="btn btn-primary btn-sm"
            style={{ textDecoration: 'none' }}
            target="_blank"
          >
            <FileText size={14} />
            Download PDF
          </Link>
        </>
      )}
    </div>
  );
}
