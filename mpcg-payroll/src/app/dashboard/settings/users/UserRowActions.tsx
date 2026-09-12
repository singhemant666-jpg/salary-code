'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser, toggleUserStatus } from '@/actions/users';
import UserModal from './UserModal';
import { Edit, Trash2, Ban, CheckCircle2 } from 'lucide-react';

interface UserRowActionsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'EMPLOYEE';
    status: 'ACTIVE' | 'INACTIVE';
  };
}

export default function UserRowActions({ user }: UserRowActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleToggleBlock = async () => {
    const actionText = user.status === 'ACTIVE' ? 'BLOCK' : 'UNBLOCK';
    if (!confirm(`Are you sure you want to ${actionText} user "${user.name}" (${user.email})?`)) {
      return;
    }

    setToggling(true);
    const res = await toggleUserStatus(user.id);
    setToggling(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete user "${user.name}" (${user.email})?`)) {
      return;
    }

    setDeleting(true);
    const res = await deleteUser(user.id);
    setDeleting(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.message);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem' }}>
      {/* 1-Click Block / Unblock Button */}
      <button
        type="button"
        onClick={handleToggleBlock}
        disabled={toggling}
        className="btn btn-ghost btn-sm"
        style={{
          color: user.status === 'ACTIVE' ? '#f59e0b' : '#22c55e',
          padding: '0.35rem 0.6rem',
          gap: '0.3rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          background: user.status === 'ACTIVE' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
          border: `1px solid ${user.status === 'ACTIVE' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(34, 197, 94, 0.25)'}`
        }}
        title={user.status === 'ACTIVE' ? 'Block User Account' : 'Unblock User Account'}
      >
        {user.status === 'ACTIVE' ? (
          <>
            <Ban size={14} /> Block
          </>
        ) : (
          <>
            <CheckCircle2 size={14} /> Unblock
          </>
        )}
      </button>

      <UserModal
        user={user}
        triggerButton={
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ color: '#06b6d4', padding: '0.35rem 0.6rem', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600 }}
            title="Edit User Details & Password"
          >
            <Edit size={14} /> Edit
          </button>
        }
      />

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="btn btn-ghost btn-sm"
        style={{ color: '#ef4444', padding: '0.35rem 0.55rem' }}
        title="Delete User Account"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
