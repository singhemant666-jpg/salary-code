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
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
      }}
    >
      <Sidebar
        userName={session.user.name || 'Admin'}
        userRole={session.user.role || 'HR_ADMIN'}
      />
      <main
        style={{
          flex: 1,
          padding: '2rem 2.25rem',
          overflowY: 'auto',
          maxHeight: '100vh',
          background: 'radial-gradient(ellipse at 30% 0%, rgba(6, 182, 212, 0.04) 0%, transparent 60%), var(--bg-primary)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
