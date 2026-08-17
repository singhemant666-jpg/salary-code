'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteHoliday } from '@/actions/holidays';
import { Trash2 } from 'lucide-react';

export default function DeleteHolidayButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the holiday "${name}"?`)) return;
    setLoading(true);
    const res = await deleteHoliday(id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="btn btn-secondary btn-sm"
      style={{ padding: '0.25rem 0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)', gap: '0.3rem' }}
      title="Delete Holiday"
    >
      <Trash2 size={13} />
      {loading ? 'Deleting...' : 'Delete'}
    </button>
  );
}
