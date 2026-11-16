import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const portalSessionCookie = req.cookies.get('mpcg_portal_session')?.value;

  // Dynamically resolve baseUrl and host
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
  const proto = req.headers.get('x-forwarded-proto') || (nextUrl.protocol ? nextUrl.protocol.replace(':', '') : 'http');
  const baseUrl = host ? `${proto}://${host}` : nextUrl.origin;

  // Check if accessed via a dedicated employee portal subdomain (e.g. portal.mypainclinicglobal.com or emp.mypainclinicglobal.com)
  const isPortalDomain = host.startsWith('portal.') || host.startsWith('emp.');

  // Forward current path to downstream server components (e.g. DashboardLayout)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-current-path', nextUrl.pathname);

  // 1. DEDICATED PORTAL DOMAIN / SUBDOMAIN ROUTING
  // If the employee accesses via portal.mypainclinicglobal.com (or emp.*):
  if (isPortalDomain) {
    // Root '/' automatically goes to '/portal'
    if (nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/portal', baseUrl));
    }
    // Strictly block admin dashboard & admin login on the portal subdomain
    if (nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/portal', baseUrl));
    }
  }

  // 2. EMPLOYEE ISOLATION FIREWALL (PORTAL SESSION):
  // If a user is logged into the Employee Portal via WhatsApp OTP (mpcg_portal_session)
  // and has NO admin NextAuth session, prevent them from accessing /dashboard, /dashboard/*, or /login.
  // They are strictly kept locked inside the Employee Portal.
  if (portalSessionCookie && !isLoggedIn) {
    if (nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname === '/login' || nextUrl.pathname === '/') {
      return NextResponse.redirect(new URL('/portal', baseUrl));
    }
  }

  // If a NextAuth user has role === 'EMPLOYEE', lock them out of admin dashboard and send to /portal
  if (isLoggedIn && role === 'EMPLOYEE') {
    if (nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/portal', baseUrl));
    }
  }

  // Public paths
  const publicPaths = ['/login', '/portal', '/api/auth', '/api/biometric', '/api/salary-slip', '/api/payroll/export-excel', '/api/iclock', '/iclock', '/apply-leave', '/icon.png', '/logo.png', '/header.png'];
  const isPublicPath = publicPaths.some(path => nextUrl.pathname.startsWith(path));

  if (isPublicPath) {
    // Redirect logged-in admin users away from login
    if (isLoggedIn && nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', baseUrl));
    }
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // Redirect unauthenticated users to login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', baseUrl));
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|_next/hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
