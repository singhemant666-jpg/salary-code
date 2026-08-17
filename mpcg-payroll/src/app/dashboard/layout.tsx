import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: 'var(--bg-primary)',
    }}>
      <Sidebar
        userName={session.user.name || 'Admin'}
        userRole={session.user.role || 'HR_ADMIN'}
      />
      <main style={{
        flex: 1,
        padding: '2rem',
        overflowY: 'auto',
        maxHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  );
}
