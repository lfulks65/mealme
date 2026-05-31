/**
 * @module supabase-server
 * Server-side Supabase client for Next.js App Router.
 *
 * Uses @supabase/ssr to create a cookie-based Supabase client
 * that reads the auth session from Next.js request cookies.
 * This enables Server Components and Server Actions to make
 * authenticated Supabase queries.
 *
 * Usage in Server Components:
 *   import { createServerClient } from '@/lib/supabase-server';
 *   const supabase = createServerClient();
 *   const { data } = await supabase.from('meal_plans').select('*');
 *
 * Usage in Server Actions:
 *   import { createServerClient } from '@/lib/supabase-server';
 *   // Same pattern — works because Server Actions also have access to cookies()
 */

import { createServerClient as createSSRClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  '';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[MealMe] Supabase environment variables are missing for server client. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

/**
 * Create a Supabase client that reads auth state from Next.js cookies.
 *
 * Must be called inside a Server Component or Server Action where
 * `next/headers` cookies() is available. The client automatically
 * handles session refresh and cookie updates.
 *
 * @returns An authenticated Supabase client instance.
 */
export function createServerClient() {
  const cookieStore = cookies();

  return createSSRClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions — the middleware handles cookie writes.
        }
      },
    },
  });
}
