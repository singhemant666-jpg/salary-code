import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
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

  const role = session.user.role;
  const permissions: string[] = session.user.permissions || [];
  const canAccess = (perm: string) => permissions.includes(perm) || permissions.includes('*');

  // Enforce granular permissions in Node.js runtime with live DB data
  if (role !== 'SUPER_ADMIN') {
    const headersList = await headers();
    const currentPath = headersList.get('x-current-path') || '';

    if (role === 'EMPLOYEE') {
      const allowedEmployeePaths = ['/dashboard', '/dashboard/my-profile', '/dashboard/my-salary'];
      if (currentPath && !allowedEmployeePaths.some(path => currentPath === path)) {
        redirect('/dashboard');
      }
    } else {
      // HR_ADMIN or ACCOUNTANT
      const getFallbackUrl = () => {
        if (canAccess('dashboard.view')) return '/dashboard';
        if (canAccess('employees.view')) return '/dashboard/employees';
        if (canAccess('attendance.view')) return '/dashboard/attendance';
        if (canAccess('payroll.view')) return '/dashboard/payroll';
        if (canAccess('salary_slips.view')) return '/dashboard/salary-slips';
        if (canAccess('reports.view')) return '/dashboard/reports';
        if (canAccess('settings.payroll')) return '/dashboard/settings';
        if (canAccess('users.manage')) return '/dashboard/settings/users';
        return '/apply-leave';
      };

      if (currentPath) {
        if ((currentPath === '/dashboard' || currentPath === '/dashboard/') && !canAccess('dashboard.view')) {
          const target = getFallbackUrl();
          if (target !== '/dashboard') {
            redirect(target);
          }
        }
        if (currentPath.startsWith('/dashboard/settings/users') && !canAccess('users.manage')) {
          redirect(getFallbackUrl());
        }
        if ((currentPath.startsWith('/dashboard/settings/whatsapp') || currentPath.startsWith('/dashboard/settings/email')) && !canAccess('settings.notifications')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/settings/holidays') && !canAccess('settings.holidays')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/settings/salary-slip-layout') && !canAccess('settings.salary_slip_layout')) {
          redirect(getFallbackUrl());
        }
        if (currentPath === '/dashboard/settings' && !canAccess('settings.payroll')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/employees') && !canAccess('employees.view')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/attendance/import') && !canAccess('attendance.import')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/attendance/leaves') && !canAccess('attendance.leaves')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/attendance/shifts') && !canAccess('attendance.shifts')) {
          redirect(getFallbackUrl());
        }
        if (currentPath === '/dashboard/attendance' && !canAccess('attendance.view')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/payroll') && !canAccess('payroll.view')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/salary-slips') && !canAccess('salary_slips.view')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/reports') && !canAccess('reports.view')) {
          redirect(getFallbackUrl());
        }
        if (currentPath.startsWith('/dashboard/audit-log') && !canAccess('audit.view')) {
          redirect(getFallbackUrl());
        }
      }
    }
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
        permissions={session.user.permissions || []}
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
