'use client';

import { toggleEmployeeStatus, deleteEmployee, toggleEmployeeOvertime } from '@/actions/employees';
import { useState } from 'react';
import { Edit, Power, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function EmployeeActions({ 
  employeeId, 
  status, 
  overtimeEligible = true 
}: { 
  employeeId: string; 
  status: string; 
  overtimeEligible?: boolean; 
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isOtEligible, setIsOtEligible] = useState(overtimeEligible);

  const handleToggleOt = async () => {
    setLoading(true);
    const res = await toggleEmployeeOvertime(employeeId);
    if (res.success) {
      setIsOtEligible(!isOtEligible);
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

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
    <div className="flex-gap" style={{ alignItems: 'center' }}>
      <button
        onClick={handleToggleOt}
        className="btn btn-sm"
        disabled={loading}
        title={`Click to ${isOtEligible ? 'Disable' : 'Enable'} Overtime for this employee`}
        style={{
          border: isOtEligible ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
          background: isOtEligible ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.04)',
          color: isOtEligible ? '#06b6d4' : 'var(--text-muted)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontWeight: 600,
        }}
      >
        <Clock size={14} />
        OT: {isOtEligible ? 'ON' : 'OFF'}
      </button>

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
