'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isInitialMount = useRef(true);

  const clearAllTimeouts = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
  };

  // When pathname or searchParams change (navigation finished)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    clearAllTimeouts();

    // Jump to 100% then fade out and unmount
    setProgress(100);

    const timer = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);

    timeoutsRef.current.push(timer);

    return () => clearAllTimeouts();
  }, [pathname, searchParams]);

  // Intercept internal link clicks to trigger progress bar immediately
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;

      const href = target.getAttribute('href');
      if (
        !href ||
        !href.startsWith('/') ||
        href.startsWith('//') ||
        target.hasAttribute('download') ||
        target.target === '_blank' ||
        target.getAttribute('rel') === 'external' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return;
      }

      const currentPath = window.location.pathname;
      const currentFull = `${window.location.pathname}${window.location.search}`;
      if (href === currentPath || href === currentFull) {
        return;
      }

      clearAllTimeouts();
      setVisible(true);
      setProgress(25);

      const p1 = setTimeout(() => {
        setProgress(60);
      }, 180);

      const p2 = setTimeout(() => {
        setProgress(85);
      }, 450);

      // Safety timeout: auto-hide if navigation takes longer than 8 seconds
      const p3 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 8000);

      timeoutsRef.current.push(p1, p2, p3);
    };

    document.addEventListener('click', handleAnchorClick, true);
    return () => {
      document.removeEventListener('click', handleAnchorClick, true);
      clearAllTimeouts();
    };
  }, []);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="top-loading-bar-container"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
      }}
    >
      <div
        className="top-loading-bar"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? 'width 0.2s ease-out, opacity 0.3s ease-out'
              : 'width 0.3s cubic-bezier(0.1, 0.05, 0.25, 1)',
        }}
      />
    </div>
  );
}
