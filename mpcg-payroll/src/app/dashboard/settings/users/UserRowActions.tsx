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
        className={`user-action-btn ${user.status === 'ACTIVE' ? 'user-action-block' : 'user-action-unblock'}`}
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
            className="user-action-btn user-action-edit"
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
        className="user-action-btn user-action-delete"
        title="Delete account permanently"
      >
        <Trash2 size={13} />
      </button>

      <style jsx>{`
        .user-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          border-radius: 7px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease;
          border: 1px solid transparent;
          font-family: inherit;
          line-height: 1.2;
        }
        .user-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Block button */
        .user-action-block {
          background: rgba(245, 158, 11, 0.08);
          color: #fbbf24;
          border-color: rgba(245, 158, 11, 0.22);
        }
        .user-action-block:hover:not(:disabled) {
          background: rgba(245, 158, 11, 0.18);
          border-color: rgba(245, 158, 11, 0.4);
        }
        :global([data-theme="light"]) .user-action-block {
          background: #fffbeb !important;
          color: #d97706 !important;
          border-color: #fde68a !important;
        }
        :global([data-theme="light"]) .user-action-block:hover:not(:disabled) {
          background: #fef3c7 !important;
          border-color: #fcd34d !important;
        }

        /* Unblock button */
        .user-action-unblock {
          background: rgba(34, 197, 94, 0.08);
          color: #4ade80;
          border-color: rgba(34, 197, 94, 0.22);
        }
        .user-action-unblock:hover:not(:disabled) {
          background: rgba(34, 197, 94, 0.18);
          border-color: rgba(34, 197, 94, 0.4);
        }
        :global([data-theme="light"]) .user-action-unblock {
          background: #f0fdf4 !important;
          color: #16a34a !important;
          border-color: #bbf7d0 !important;
        }
        :global([data-theme="light"]) .user-action-unblock:hover:not(:disabled) {
          background: #dcfce7 !important;
          border-color: #86efac !important;
        }

        /* Edit button */
        .user-action-edit {
          background: rgba(56, 189, 248, 0.08);
          color: #38bdf8;
          border-color: rgba(56, 189, 248, 0.25);
        }
        .user-action-edit:hover {
          background: rgba(56, 189, 248, 0.18);
          border-color: rgba(56, 189, 248, 0.45);
        }
        :global([data-theme="light"]) .user-action-edit {
          background: #f0f9ff !important;
          color: #0284c7 !important;
          border-color: #bae6fd !important;
        }
        :global([data-theme="light"]) .user-action-edit:hover {
          background: #e0f2fe !important;
          border-color: #7dd3fc !important;
        }

        /* Delete button */
        .user-action-delete {
          padding: 0.35rem 0.5rem;
          background: rgba(239, 68, 68, 0.08);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.22);
        }
        .user-action-delete:hover:not(:disabled) {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }
        :global([data-theme="light"]) .user-action-delete {
          background: #fff1f2 !important;
          color: #e11d48 !important;
          border-color: #fecdd3 !important;
        }
        :global([data-theme="light"]) .user-action-delete:hover:not(:disabled) {
          background: #ffe4e6 !important;
          border-color: #fda4af !important;
        }
      `}</style>
    </div>
  );
}
