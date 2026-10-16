'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';

export default function EmployeeSearch({ departments }: { departments: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const urlSearch = searchParams.get('search') || '';
  const [search, setSearch] = useState(urlSearch);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Synchronize state if URL search param changes externally (e.g., back/forward buttons)
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  const executeSearch = useCallback((query: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = query.trim();
    if (trimmed) {
      params.set('search', trimmed);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  // Real-time debounced auto-search as user types
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(value);
    }, 280);
  };

  // Immediate search on Enter
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    executeSearch(search);
  };

  // Immediate clear
  const handleClear = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearch('');
    executeSearch('');
  };

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.replace(`${pathname}?${params.toString()}`);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="filter-bar">
      <form onSubmit={handleSubmit} className="search-bar" style={{ flex: 1, maxWidth: '360px', position: 'relative' }}>
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, ID, or biometric ID..."
          value={search}
          onChange={handleChange}
          style={{ paddingRight: search ? '2.25rem' : '0.875rem' }}
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            title="Clear search"
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-tertiary, #94a3b8)',
              padding: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'var(--text-tertiary, #94a3b8)';
            }}
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        )}
      </form>

      <select
        className="form-select"
        style={{ width: '160px' }}
        value={searchParams.get('status') || ''}
        onChange={(e) => handleFilter('status', e.target.value)}
      >
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="TERMINATED">Terminated</option>
      </select>

      <select
        className="form-select"
        style={{ width: '180px' }}
        value={searchParams.get('department') || ''}
        onChange={(e) => handleFilter('department', e.target.value)}
      >
        <option value="">All Departments</option>
        {departments.map((dept) => (
          <option key={dept} value={dept}>{dept}</option>
        ))}
      </select>
    </div>
  );
}
