'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export const ATTENDANCE_STORAGE_KEY = 'mpcg_last_attendance_url';
export const ATTENDANCE_FILTERS_KEY = 'mpcg_attendance_filters';

export default function AttendanceStatePreserver({ currentUrl }: { currentUrl: string }) {
  const router = useRouter();
  const hasRestoredRef = useRef(false);

  // 1. On initial mount: if URL does not specify explicit filter params, check storage and restore
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const hasExplicitFilter =
        params.has('month') ||
        params.has('year') ||
        params.has('date') ||
        params.has('employeeId') ||
        params.has('search');

      if (!hasExplicitFilter) {
        const saved =
          sessionStorage.getItem(ATTENDANCE_STORAGE_KEY) ||
          localStorage.getItem(ATTENDANCE_STORAGE_KEY);

        if (saved && saved.startsWith('/dashboard/attendance?') && saved !== '/dashboard/attendance') {
          router.replace(saved);
          return;
        }

        // If no saved URL, sync the URL in the browser address bar with currentUrl so reload preserves it
        if (currentUrl && currentUrl.startsWith('/dashboard/attendance?') && currentUrl !== '/dashboard/attendance') {
          sessionStorage.setItem(ATTENDANCE_STORAGE_KEY, currentUrl);
          localStorage.setItem(ATTENDANCE_STORAGE_KEY, currentUrl);
          window.history.replaceState({}, '', currentUrl);
        }
      }
    } catch {
      // Storage access might fail in restricted iframe or private mode
    }
  }, [currentUrl, router]);

  // 2. Persist whenever currentUrl changes
  useEffect(() => {
    try {
      if (currentUrl && currentUrl.startsWith('/dashboard/attendance?') && currentUrl !== '/dashboard/attendance') {
        sessionStorage.setItem(ATTENDANCE_STORAGE_KEY, currentUrl);
        localStorage.setItem(ATTENDANCE_STORAGE_KEY, currentUrl);
      }
    } catch {
      // ignore
    }
  }, [currentUrl]);

  return null;
}

