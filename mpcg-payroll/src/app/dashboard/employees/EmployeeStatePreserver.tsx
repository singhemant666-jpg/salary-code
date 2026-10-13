'use client';

import { useEffect } from 'react';

export default function EmployeeStatePreserver({ currentUrl }: { currentUrl: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem('mpcg_last_employees_url', currentUrl);
    } catch {
      // sessionStorage might fail in private browsing or restricted iframe
    }
  }, [currentUrl]);

  return null;
}
