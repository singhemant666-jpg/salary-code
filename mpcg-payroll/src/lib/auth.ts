import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

import { parsePermissions } from '@/lib/permissions';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
      permissions?: string[];
    };
  }

  interface User {
    role: 'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
    permissions?: string[];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || user.status !== 'ACTIVE') {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        let rawPermissions = (user as any).permissions;
        if (rawPermissions === undefined) {
          try {
            const rawRows: any[] = await prisma.$queryRaw`SELECT permissions FROM users WHERE id = ${user.id} LIMIT 1`;
            rawPermissions = rawRows[0]?.permissions;
          } catch (e) {
            console.warn('Could not query raw permissions in authorize:', e);
          }
        }

        const permissions = parsePermissions(rawPermissions, user.role);

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role as any,
          permissions,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = user.role;
        (token as any).permissions = user.permissions || [];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'SUPER_ADMIN' | 'HR_ADMIN' | 'ACCOUNTANT' | 'EMPLOYEE';
        session.user.permissions = ((token as any).permissions as string[]) || [];
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.AUTH_SECRET || 'mpcg-payroll-secret-key-change-in-production-2026',
  cookies: {
    sessionToken: {
      name: 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production' && Boolean(process.env.NEXTAUTH_URL?.startsWith('https')),
      },
    },
  },
  trustHost: true,
});
