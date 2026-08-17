import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

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
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">{users.length} users · Super Admin access only</p>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: any) => (
              <tr key={user.id}>
                <td style={{ fontWeight: 500 }}>{user.name}</td>
                <td className="text-muted">{user.email}</td>
                <td>
                  <span className={`badge ${user.role === 'SUPER_ADMIN' ? 'badge-finalized' : 'badge-info'}`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <span className={`badge ${user.status === 'ACTIVE' ? 'badge-active' : 'badge-inactive'}`}>
                    {user.status}
                  </span>
                </td>
                <td className="text-sm text-muted">{user.createdAt.toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
