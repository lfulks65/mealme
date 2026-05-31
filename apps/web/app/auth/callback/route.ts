import { NextResponse } from 'next/server';
import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Next.js App Router handler for the Supabase OAuth callback.
 *
 * Supabase redirects users here after they authenticate with a
 * third-party provider (Google / Apple). The URL contains a `code`
 * query parameter that we exchange for a session. The session is then
 * stored as a cookie so that subsequent requests (and the middleware)
 * recognise the user as authenticated.
 *
 * Success → /dashboard
 * Failure → /login?error=auth_callback_failed
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `next` is an optional param that Supabase may include to signal
  // where the user originally wanted to go (e.g. after email confirm).
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = cookies();

    const supabase = createSSRClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options as any),
              );
            } catch {
              // setAll can fail when called from a Server Component.
              // The middleware handles session refresh, so this is safe
              // to ignore.
            }
          },
        },
      },
    );

    // Exchange the OAuth code for a session (sets auth cookies)
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or exchange failed — redirect to login with error flag
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
