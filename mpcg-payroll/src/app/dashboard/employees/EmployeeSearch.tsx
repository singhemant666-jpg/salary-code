'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';

export default function EmployeeSearch({ departments }: { departments: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) params.set('search', search);
    else params.delete('search');
    params.set('page', '1');
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    router.push(`/dashboard/employees?${params.toString()}`);
  };

  return (
    <div className="filter-bar">
      <form onSubmit={handleSearch} className="search-bar" style={{ flex: 1, maxWidth: '360px' }}>
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="form-input"
          placeholder="Search by name, ID, or biometric ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
