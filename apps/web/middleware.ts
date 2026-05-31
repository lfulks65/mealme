import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/meal-plan'];

// Routes that should redirect away if already authenticated
const authRoutes = ['/login', '/signup', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for auth session cookie (Supabase sets sb-<ref>-auth-token)
  const hasSession = request.cookies.getAll().some((c) =>
    c.name.startsWith('sb-') && c.name.includes('-auth-token'),
  );

  // Redirect unauthenticated users from protected routes to login
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!hasSession) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (authRoutes.some((route) => pathname === route)) {
    if (hasSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/meal-plan/:path*',
    '/login',
    '/signup',
    '/forgot-password',
  ],
};
