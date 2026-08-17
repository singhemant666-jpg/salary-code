'use client';

import { deleteAllEmployees } from '@/actions/employees';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClearSampleButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    if (!confirm('⚠️ Are you sure you want to DELETE ALL employees, attendance records, and payroll data? This action cannot be undone.')) return;
    setLoading(true);
    const res = await deleteAllEmployees();
    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleClear}
      className="btn btn-danger"
      disabled={loading}
      title="Delete All Employees and Attendance Data"
    >
      <Trash2 size={16} />
      {loading ? 'Wiping Database...' : 'Delete All Employees'}
    </button>
  );
}
