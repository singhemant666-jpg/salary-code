'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';

interface EmployeeBackButtonProps {
  returnUrl?: string;
  fallbackHref?: string;
}

export default function EmployeeBackButton({
  returnUrl,
  fallbackHref = '/dashboard/employees',
}: EmployeeBackButtonProps) {
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState<string>(returnUrl || fallbackHref);

  useEffect(() => {
    if (returnUrl) {
      setTargetUrl(returnUrl);
      return;
    }
    try {
      const saved = sessionStorage.getItem('mpcg_last_employees_url');
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
      const saved = sessionStorage.getItem('mpcg_last_employees_url');
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
      title="Back to employees list"
    >
      <ArrowLeft size={20} />
    </a>
  );
}
