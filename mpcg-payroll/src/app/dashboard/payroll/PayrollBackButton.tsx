'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PayrollBackButtonProps {
  returnUrl?: string;
  defaultMonth: number;
  defaultYear: number;
}

export default function PayrollBackButton({
  returnUrl,
  defaultMonth,
  defaultYear,
}: PayrollBackButtonProps) {
  const router = useRouter();
  const fallbackHref = `/dashboard/payroll?month=${defaultMonth}&year=${defaultYear}`;
  const [targetUrl, setTargetUrl] = useState<string>(returnUrl || fallbackHref);

  useEffect(() => {
    if (returnUrl) {
      setTargetUrl(returnUrl);
      return;
    }
    try {
      const saved = sessionStorage.getItem('mpcg_last_payroll_url');
      if (saved) {
        setTargetUrl(saved);
      }
    } catch {
      // sessionStorage unavailable
    }
  }, [returnUrl, fallbackHref]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (returnUrl) {
      router.push(returnUrl);
      return;
    }
    try {
      const saved = sessionStorage.getItem('mpcg_last_payroll_url');
      if (saved) {
        router.push(saved);
        return;
      }
    } catch {
      // fallback
    }
    router.push(fallbackHref);
  };

  return (
    <a
      href={targetUrl}
      onClick={handleClick}
      className="btn btn-ghost btn-icon"
      style={{
        textDecoration: 'none',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      title="Back to payroll list"
    >
      <ArrowLeft size={20} />
    </a>
  );
}
