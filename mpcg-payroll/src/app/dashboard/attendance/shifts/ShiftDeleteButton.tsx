'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteShiftOverride } from '@/actions/shift-overrides';
import { Trash2 } from 'lucide-react';

export default function ShiftDeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this shift timing override? Attendance and payroll for affected dates will be recalculated.')) {
      return;
    }

    setLoading(true);
    const res = await deleteShiftOverride(id);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-ghost btn-icon btn-sm"
      style={{ padding: '0.3rem', color: '#ef4444' }}
      title="Delete Shift Override"
    >
      <Trash2 size={16} />
    </button>
  );
}
