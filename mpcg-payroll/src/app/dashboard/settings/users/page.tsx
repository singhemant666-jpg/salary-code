import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UserModal from './UserModal';
import UserRowActions from './UserRowActions';
import {
  ShieldCheck,
  Users,
  ShieldAlert,
  UserCheck2,
  UserX2,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { parsePermissions, ALL_PERMISSIONS } from '@/lib/permissions';

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard');

  let users: any[] = [];
  try {
    const rawUsers: any[] = await prisma.$queryRaw`
      SELECT id, email, name, role, status, permissions, createdAt 
      FROM users 
      ORDER BY createdAt DESC
    `;
    users = rawUsers.map(u => ({
      ...u,
      createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt),
    }));
  } catch (err) {
    users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'ACTIVE').length;
  const blockedUsers = users.filter(u => u.status === 'INACTIVE').length;
  const adminUsers = users.filter(u => u.role === 'SUPER_ADMIN').length;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1.25rem',
          paddingBottom: '0.5rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(59, 130, 246, 0.15) 100%)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '-0.025em',
                  color: 'var(--text-primary)',
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                User & Access Control
              </h1>
            </div>
          </div>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              margin: 0,
              paddingLeft: '2.9rem',
            }}
          >
            Manage organizational users, authentication credentials, and fine-grained module privileges.
          </p>
        </div>

        <UserModal />
      </div>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Metric 1 */}
        <div
          style={{
            padding: '1.1rem 1.25rem',
            borderRadius: '14px',
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Users
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
              {totalUsers}
            </div>
          </div>
        </div>

        {/* Metric 2 */}
        <div
          style={{
            padding: '1.1rem 1.25rem',
            borderRadius: '14px',
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              color: '#4ade80',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserCheck2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Access
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#4ade80', lineHeight: 1.2 }}>
              {activeUsers}
            </div>
          </div>
        </div>

        {/* Metric 3 */}
        <div
          style={{
            padding: '1.1rem 1.25rem',
            borderRadius: '14px',
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: blockedUsers > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.08)',
              border: `1px solid ${blockedUsers > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
              color: blockedUsers > 0 ? '#f87171' : 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserX2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Blocked Accounts
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: blockedUsers > 0 ? '#f87171' : 'var(--text-primary)', lineHeight: 1.2 }}>
              {blockedUsers}
            </div>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          style={{
            padding: '1.1rem 1.25rem',
            borderRadius: '14px',
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(168, 85, 247, 0.12)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              color: '#c084fc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Super Admins
            </div>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#c084fc', lineHeight: 1.2 }}>
              {adminUsers}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <div
        style={{
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  User Profile
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Username / Email
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Role Tier
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Privileges & Scope
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Status
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  Joined Date
                </th>
                <th style={{ padding: '0.9rem 1.25rem', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', fontWeight: 700, textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <Users size={36} style={{ color: 'var(--text-tertiary)', opacity: 0.6 }} />
                      <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>No system users found</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Click "+ Add New User" above to grant system access.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((user: any) => {
                  const perms = parsePermissions(user.permissions, user.role);
                  const isSuperAdmin = user.role === 'SUPER_ADMIN';

                  // Generate Avatar Initials
                  const initials = user.name
                    ?.split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'U';

                  // Role badge styling
                  let roleBg = 'rgba(6, 182, 212, 0.12)';
                  let roleColor = '#38bdf8';
                  let roleBorder = 'rgba(6, 182, 212, 0.28)';

                  if (user.role === 'SUPER_ADMIN') {
                    roleBg = 'rgba(168, 85, 247, 0.14)';
                    roleColor = '#c084fc';
                    roleBorder = 'rgba(168, 85, 247, 0.3)';
                  } else if (user.role === 'ACCOUNTANT') {
                    roleBg = 'rgba(16, 185, 129, 0.12)';
                    roleColor = '#34d399';
                    roleBorder = 'rgba(16, 185, 129, 0.28)';
                  } else if (user.role === 'EMPLOYEE') {
                    roleBg = 'rgba(148, 163, 184, 0.12)';
                    roleColor = '#cbd5e1';
                    roleBorder = 'rgba(148, 163, 184, 0.25)';
                  }

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        transition: 'background 150ms ease',
                      }}
                      className="hover:bg-white/[0.02]"
                    >
                      {/* Name & Avatar */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)',
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                              {user.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              ID: {user.id.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span
                          style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {user.email}
                        </span>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.28rem 0.65rem',
                            borderRadius: '6px',
                            background: roleBg,
                            color: roleColor,
                            border: `1px solid ${roleBorder}`,
                            fontSize: '0.74rem',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {user.role.replace(/_/g, ' ')}
                        </span>
                      </td>

                      {/* Permissions */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        {isSuperAdmin ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.28rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(168, 85, 247, 0.12)',
                              color: '#c084fc',
                              border: '1px solid rgba(168, 85, 247, 0.28)',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                            }}
                          >
                            <Sparkles size={12} /> Universal Root ({ALL_PERMISSIONS.length})
                          </span>
                        ) : perms.length > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.28rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(6, 182, 212, 0.1)',
                              color: '#38bdf8',
                              border: '1px solid rgba(6, 182, 212, 0.25)',
                              fontSize: '0.74rem',
                              fontWeight: 600,
                            }}
                            title={perms.join(', ')}
                          >
                            <KeyRound size={12} /> {perms.length} of {ALL_PERMISSIONS.length} Modules
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '0.28rem 0.65rem',
                              borderRadius: '6px',
                              background: 'rgba(148, 163, 184, 0.08)',
                              color: 'var(--text-secondary)',
                              fontSize: '0.74rem',
                            }}
                          >
                            No Permissions
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.9rem 1.25rem' }}>
                        {user.status === 'ACTIVE' ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.26rem 0.6rem',
                              borderRadius: '999px',
                              background: 'rgba(34, 197, 94, 0.1)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.25)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#22c55e',
                                boxShadow: '0 0 8px #22c55e',
                              }}
                            />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.26rem 0.6rem',
                              borderRadius: '999px',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#f87171',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                background: '#ef4444',
                              }}
                            />
                            Blocked
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {user.createdAt.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                        <UserRowActions
                          user={{
                            id: user.id,
                            name: user.name,
                            email: user.email,
                            role: user.role,
                            status: user.status,
                            permissions: user.permissions,
                          }}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
