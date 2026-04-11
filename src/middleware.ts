// src/middleware.ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    if (req.nextauth.token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        if (
          pathname.startsWith('/login') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/onboarding') ||
          pathname === '/'
        ) return true;
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.json|apple-icon.png|icon-192.png|icon-512.png).*)'],
};
