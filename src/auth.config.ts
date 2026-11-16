import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname.startsWith('/login');
      const isPublicAsset =
        nextUrl.pathname.startsWith('/_next') ||
        nextUrl.pathname.startsWith('/api/auth') ||
        nextUrl.pathname === '/favicon.ico';

      if (isPublicAsset) return true;

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/incidents', nextUrl));
        }
        return true;
      }

      // All other routes require authentication
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as { role: string }).role;
        token.organizationId = (user as unknown as { organizationId: string }).organizationId;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as { role: string }).role = token.role as string;
        (session.user as unknown as { organizationId: string }).organizationId = token.organizationId as string;
      }
      return session;
    },
  },
  providers: [], // Configured in src/auth.ts with credentials provider
};
