'use client';

import { toggleEmployeeStatus, deleteEmployee } from '@/actions/employees';
import { useState } from 'react';
import { Edit, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EmployeeActions({ employeeId, status }: { employeeId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    if (!confirm(`Are you sure you want to ${status === 'ACTIVE' ? 'deactivate' : 'activate'} this employee?`)) return;
    setLoading(true);
    await toggleEmployeeStatus(employeeId);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;
    setLoading(true);
    const res = await deleteEmployee(employeeId);
    if (res.success) {
      router.push('/dashboard/employees');
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex-gap">
      <Link href={`/dashboard/employees/${employeeId}/edit`} className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
        <Edit size={14} /> Edit Profile
      </Link>
      <button
        onClick={handleToggle}
        className={`btn ${status === 'ACTIVE' ? 'btn-danger' : 'btn-success'} btn-sm`}
        disabled={loading}
      >
        <Power size={14} />
        {status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
      </button>
      <button
        onClick={handleDelete}
        className="btn btn-danger btn-sm"
        disabled={loading}
        title="Delete Employee"
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}
