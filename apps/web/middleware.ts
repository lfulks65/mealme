import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/meal-plan', '/recipes', '/families'];

// Routes that should redirect away if already authenticated
const authRoutes = ['/login', '/signup', '/forgot-password'];

// Routes accessible with or without auth (e.g., password reset):
// '/', '/reset-password' — these are neither in protectedRoutes nor authRoutes,
// so the middleware allows them through regardless of auth state.

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Validate required environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      '[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Skipping session validation — allowing request through.',
    );
    return NextResponse.next({ request });
  }

  // Create a Supabase server client for middleware
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // Validate the session (this refreshes the token if needed)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const isAuthenticated = !!session;

  // Redirect unauthenticated users from protected routes to login
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (authRoutes.some((route) => pathname === route)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/meal-plan/:path*',
    '/recipes/:path*',
    '/families/:path*',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
  ],
};
