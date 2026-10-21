'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteUser, toggleUserStatus } from '@/actions/users';
import UserModal from './UserModal';
import { Edit, Trash2, Ban, CheckCircle2, MoreHorizontal } from 'lucide-react';

interface UserRowActionsProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
    status: 'ACTIVE' | 'INACTIVE';
    permissions?: any;
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
    if (!confirm(`Are you sure you want to delete user "${user.name}" (${user.email})? This action cannot be undone.`)) {
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
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.45rem',
        justifyContent: 'flex-end',
      }}
    >
      {/* 1-Click Block / Unblock Button */}
      <button
        type="button"
        onClick={handleToggleBlock}
        disabled={toggling}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.35rem 0.65rem',
          borderRadius: '7px',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: toggling ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease',
          background: user.status === 'ACTIVE' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(34, 197, 94, 0.08)',
          color: user.status === 'ACTIVE' ? '#fbbf24' : '#4ade80',
          border: `1px solid ${user.status === 'ACTIVE' ? 'rgba(245, 158, 11, 0.22)' : 'rgba(34, 197, 94, 0.22)'}`,
        }}
        title={user.status === 'ACTIVE' ? 'Suspend / Block this account' : 'Restore / Unblock access'}
      >
        {user.status === 'ACTIVE' ? (
          <>
            <Ban size={13} />
            <span>Block</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={13} />
            <span>Unblock</span>
          </>
        )}
      </button>

      {/* Edit User Modal Trigger */}
      <UserModal
        user={user}
        triggerButton={
          <button
            type="button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.35rem 0.65rem',
              borderRadius: '7px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              background: 'rgba(56, 189, 248, 0.08)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.22)',
            }}
            title="Edit credentials, roles, and permissions"
          >
            <Edit size={13} />
            <span>Edit</span>
          </button>
        }
      />

      {/* Delete User Button */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '7px',
          cursor: deleting ? 'not-allowed' : 'pointer',
          transition: 'all 150ms ease',
          background: 'rgba(239, 68, 68, 0.08)',
          color: '#f87171',
          border: '1px solid rgba(239, 68, 68, 0.22)',
        }}
        title="Delete account permanently"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
