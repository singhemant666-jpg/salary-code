import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Dynamically resolve baseUrl from host headers so LAN and tunnel devices stay on their host
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || (nextUrl.protocol ? nextUrl.protocol.replace(':', '') : 'http');
  const baseUrl = host ? `${proto}://${host}` : nextUrl.origin;

  // Public paths
  const publicPaths = ['/login', '/api/auth', '/api/biometric', '/api/salary-slip', '/api/payroll/export-excel', '/api/iclock', '/iclock', '/apply-leave', '/icon.png', '/logo.png', '/header.png'];
  const isPublicPath = publicPaths.some(path => nextUrl.pathname.startsWith(path));

  if (isPublicPath) {
    // Redirect logged-in users away from login
    if (isLoggedIn && nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', baseUrl));
  }

  // Admin and permission-based route protection
  if (role !== 'SUPER_ADMIN') {
    // Employee-restricted routes
    if (role === 'EMPLOYEE') {
      const allowedEmployeePaths = ['/dashboard', '/dashboard/my-profile', '/dashboard/my-salary'];
      const isAllowed = allowedEmployeePaths.some(path => nextUrl.pathname === path);
      if (!isAllowed) {
        return NextResponse.redirect(new URL('/dashboard', baseUrl));
      }
      return NextResponse.next();
    }

    const userObj = req.auth?.user;
    const permissions: string[] = userObj?.permissions || [];
    const path = nextUrl.pathname;

    const canAccess = (perm: string) => permissions.includes(perm) || permissions.includes('*');

    // Route permissions map
    if (path.startsWith('/dashboard/settings/users') && !canAccess('users.manage')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if ((path.startsWith('/dashboard/settings/whatsapp') || path.startsWith('/dashboard/settings/email')) && !canAccess('settings.notifications')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/settings/holidays') && !canAccess('settings.holidays')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/settings/salary-slip-layout') && !canAccess('settings.salary_slip_layout')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path === '/dashboard/settings' && !canAccess('settings.payroll')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/employees') && !canAccess('employees.view')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/attendance/import') && !canAccess('attendance.import')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/attendance/leaves') && !canAccess('attendance.leaves')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/attendance/shifts') && !canAccess('attendance.shifts')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path === '/dashboard/attendance' && !canAccess('attendance.view')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/payroll') && !canAccess('payroll.view')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/salary-slips') && !canAccess('salary_slips.view')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/reports') && !canAccess('reports.view')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    if (path.startsWith('/dashboard/audit-log') && !canAccess('audit.view')) {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|_next/hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
