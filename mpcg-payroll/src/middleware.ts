import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;

  // Public paths
  const publicPaths = ['/login', '/api/auth', '/api/biometric', '/api/salary-slip', '/api/iclock', '/iclock', '/apply-leave'];
  const isPublicPath = publicPaths.some(path => nextUrl.pathname.startsWith(path));

  if (isPublicPath) {
    // Redirect logged-in users away from login
    if (isLoggedIn && nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  // Admin-only routes
  const adminPaths = ['/dashboard/settings/users'];
  const isAdminPath = adminPaths.some(path => nextUrl.pathname.startsWith(path));

  if (isAdminPath && role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl));
  }

  // Employee-restricted routes
  if (role === 'EMPLOYEE') {
    const allowedEmployeePaths = ['/dashboard', '/dashboard/my-profile', '/dashboard/my-salary'];
    const isAllowed = allowedEmployeePaths.some(path => nextUrl.pathname === path);
    if (!isAllowed) {
      return NextResponse.redirect(new URL('/dashboard', nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo|fonts).*)'],
};
