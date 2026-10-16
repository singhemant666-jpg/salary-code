'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, ChevronDown, Check, Users, User } from 'lucide-react';

type SimpleEmployee = { id: string; name: string; employeeId: string; status?: string };

function getInitials(name: string) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarBg(name: string) {
  const colors = [
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #06b6d4, #0891b2)',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AttendanceFilters({
  employees = [],
  defaultMonth,
  defaultYear,
  initialSelectedEmployee = null,
}: {
  employees?: SimpleEmployee[];
  defaultMonth?: number;
  defaultYear?: number;
  initialSelectedEmployee?: SimpleEmployee | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = new Date();

  const activeMonth = searchParams.get('month') || String(defaultMonth || now.getMonth() + 1);
  const activeYear = searchParams.get('year') || String(defaultYear || now.getFullYear());
  const activeEmployee = searchParams.get('employeeId') || '';

  // Combobox Search & Dropdown State
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedEmployee = useMemo(() => {
    return employees.find(e => e.id === activeEmployee) || initialSelectedEmployee || null;
  }, [employees, activeEmployee, initialSelectedEmployee]);

  // Ensure only active employees are displayed in the dropdown list
  const activeEmployees = useMemo(() => {
    return employees.filter(e => !e.status || e.status === 'ACTIVE');
  }, [employees]);

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return activeEmployees;
    const q = searchQuery.toLowerCase().trim();
    return activeEmployees.filter(
      emp =>
        emp.name.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q)
    );
  }, [activeEmployees, searchQuery]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const handleSelectEmployee = (empId: string) => {
    handleFilter('employeeId', empId);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClearEmployee = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleFilter('employeeId', '');
    setSearchQuery('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="filter-bar" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
      {/* 1. Searchable Employee Combobox */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          minWidth: '250px',
          maxWidth: '320px',
          flex: '1 1 250px',
        }}
      >
        <div
          onClick={() => {
            setIsOpen(true);
            inputRef.current?.focus();
          }}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            background: 'var(--bg-input, rgba(255, 255, 255, 0.04))',
            border: isOpen
              ? '1px solid #6366f1'
              : '1px solid var(--border-secondary, rgba(255, 255, 255, 0.12))',
            borderRadius: '8px',
            padding: '0 0.65rem',
            height: '38px',
            boxShadow: isOpen ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
            transition: 'all 0.15s ease',
            cursor: 'text',
          }}
        >
          <Search
            size={15}
            style={{
              color: isOpen ? '#818cf8' : 'var(--text-tertiary, #94a3b8)',
              marginRight: '0.45rem',
              flexShrink: 0,
            }}
          />

          <input
            ref={inputRef}
            type="text"
            value={isOpen ? searchQuery : (selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.employeeId})` : '')}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
            }}
            placeholder={selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.employeeId})` : "Search employee by name or ID..."}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '0.82rem',
              color: 'var(--text-primary, #ffffff)',
              fontWeight: selectedEmployee && !isOpen ? 600 : 400,
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0, marginLeft: '0.35rem' }}>
            {(activeEmployee || searchQuery) && (
              <button
                type="button"
                onClick={handleClearEmployee}
                title="Clear employee filter"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary, #94a3b8)',
                  padding: 0,
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'var(--text-secondary, #94a3b8)';
                }}
              >
                <X size={11} strokeWidth={2.5} />
              </button>
            )}

            <ChevronDown
              size={14}
              style={{
                color: 'var(--text-tertiary, #94a3b8)',
                transition: 'transform 0.2s ease',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
                if (!isOpen) inputRef.current?.focus();
              }}
            />
          </div>
        </div>

        {/* Dropdown Results Menu */}
        {isOpen && (
          <div
            className="animate-fade-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              width: '100%',
              minWidth: '290px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'var(--bg-modal, #0f172a)',
              border: '1px solid var(--modal-border, rgba(255, 255, 255, 0.12))',
              borderRadius: '10px',
              boxShadow: '0 12px 28px rgba(0, 0, 0, 0.45)',
              padding: '0.4rem',
              zIndex: 100,
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Option: All Employees */}
            <button
              type="button"
              onClick={() => handleSelectEmployee('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '0.5rem 0.65rem',
                borderRadius: '6px',
                border: 'none',
                background: !activeEmployee ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: !activeEmployee ? '#818cf8' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: !activeEmployee ? 700 : 500,
                textAlign: 'left',
                transition: 'background 0.12s ease',
              }}
              className="emp-select-item"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div
                  style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#818cf8',
                  }}
                >
                  <Users size={13} />
                </div>
                <span>All Employees</span>
              </div>
              {!activeEmployee && <Check size={14} style={{ color: '#818cf8' }} />}
            </button>

            <div style={{ height: '1px', background: 'var(--border-secondary, rgba(255, 255, 255, 0.08))', margin: '0.3rem 0' }} />

            {/* List of Filtered Employees */}
            {filteredEmployees.length === 0 ? (
              <div
                style={{
                  padding: '1.25rem 0.75rem',
                  textAlign: 'center',
                  fontSize: '0.8rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                No employee found matching &ldquo;<span style={{ color: '#818cf8' }}>{searchQuery}</span>&rdquo;
              </div>
            ) : (
              filteredEmployees.map((emp) => {
                const isSelected = activeEmployee === emp.id;
                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.45rem 0.65rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                      color: isSelected ? '#818cf8' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      textAlign: 'left',
                      transition: 'background 0.12s ease',
                    }}
                    className="emp-select-item"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: getAvatarBg(emp.name),
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.68rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(emp.name)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: isSelected ? 700 : 600,
                            color: 'var(--text-primary)',
                            fontSize: '0.8rem',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {emp.name}
                        </div>
                        <div
                          className="font-mono text-xs"
                          style={{
                            fontSize: '0.7rem',
                            color: 'var(--text-tertiary)',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {emp.employeeId}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check size={14} style={{ color: '#818cf8', flexShrink: 0 }} />}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 2. Month Selector */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <select
          className="form-select"
          style={{ width: '130px', height: '38px', borderRadius: '8px' }}
          value={activeMonth}
          onChange={(e) => handleFilter('month', e.target.value)}
        >
          {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
            <option key={i} value={i + 1}>{m}</option>
          ))}
        </select>
      </div>

      {/* 3. Year Selector */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <select
          className="form-select"
          style={{ width: '110px', height: '38px', borderRadius: '8px' }}
          value={activeYear}
          onChange={(e) => handleFilter('year', e.target.value)}
        >
          {[2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* 4. Date Picker */}
      <div className="form-group" style={{ marginBottom: 0 }}>
        <input
          type="date"
          className="form-input"
          style={{ width: '170px', height: '38px', borderRadius: '8px' }}
          value={searchParams.get('date') || ''}
          onChange={(e) => handleFilter('date', e.target.value)}
        />
      </div>

      {/* 5. Clear Filter Button (if employee is filtered) */}
      {activeEmployee && (
        <button
          type="button"
          onClick={() => handleFilter('employeeId', '')}
          className="btn btn-secondary btn-sm"
          style={{ height: '38px', padding: '0 0.85rem', fontSize: '0.8rem', borderRadius: '8px', gap: '0.35rem' }}
        >
          <X size={13} />
          Clear Filter
        </button>
      )}

      {/* 6. Sync Realtime Cloud Button */}
      <button
        type="button"
        onClick={async () => {
          const { syncRealtimeCloudPunches } = await import('@/actions/realtime-cloud-sync');
          const res = await syncRealtimeCloudPunches();
          alert(res.message);
          router.refresh();
        }}
        className="btn btn-primary btn-sm"
        style={{ height: '38px', gap: '0.4rem', backgroundColor: '#0284c7', borderColor: '#0284c7', borderRadius: '8px' }}
        title="Sync punches from Realsoft Cloud (http://realsoftcloud.com:85)"
      >
        📡 Sync Realtime Cloud
      </button>

      <style jsx global>{`
        .emp-select-item:hover {
          background: rgba(255, 255, 255, 0.08) !important;
        }
        [data-theme="light"] .emp-select-item:hover {
          background: rgba(0, 0, 0, 0.05) !important;
        }
      `}</style>
    </div>
  );
}
