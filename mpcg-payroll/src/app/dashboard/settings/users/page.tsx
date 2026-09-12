import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import UserModal from './UserModal';
import UserRowActions from './UserRowActions';
import { ShieldCheck, UserCheck } from 'lucide-react';

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== 'SUPER_ADMIN') redirect('/dashboard');

  const users = await prisma.user.findMany({
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldCheck size={24} style={{ color: '#06b6d4' }} /> User Management
          </h1>
          <p className="page-subtitle">{users.length} system users recorded · Super Admin access only</p>
        </div>
        <UserModal />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email Address (Username)</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created Date</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted" style={{ padding: '3rem 1rem' }}>
                  No system users found.
                </td>
              </tr>
            ) : (
              users.map((user: any) => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <UserCheck size={16} style={{ color: '#06b6d4' }} />
                      <span>{user.name}</span>
                    </div>
                  </td>
                  <td className="text-muted font-mono">{user.email}</td>
                  <td>
                    <span className={`badge ${user.role === 'SUPER_ADMIN' ? 'badge-finalized' : 'badge-info'}`} style={{ fontWeight: 600 }}>
                      {user.role.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.status === 'ACTIVE' ? 'badge-approved' : 'badge-error'}`} style={{ fontWeight: 700 }}>
                      {user.status === 'ACTIVE' ? '✓ ACTIVE' : '🚫 BLOCKED'}
                    </span>
                  </td>
                  <td className="text-sm text-muted font-mono">
                    {user.createdAt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <UserRowActions user={{
                      id: user.id,
                      name: user.name,
                      email: user.email,
                      role: user.role,
                      status: user.status,
                    }} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
