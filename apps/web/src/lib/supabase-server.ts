/**
 * @module supabase-server
 * Server-side Supabase client for Next.js App Router.
 *
 * Uses @supabase/ssr to create a cookie-based Supabase client
 * that reads the auth state from Next.js request cookies.
 * This enables Server Components and Server Actions to make
 * authenticated Supabase queries.
 */

import { createServerClient as createSSRClient } from '@supabase/ssr';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[MealMe] Supabase environment variables are missing for server client. ' +
      'Set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

/**
 * Result type returned by Supabase queries that the app code expects.
 */
interface SupabaseResult<T = unknown> {
  data: T | null;
  error: unknown | null;
}

/**
 * A chainable no-op query builder. Any method call returns a new
 * chainable, and when awaited (via .then), resolves to
 * { data: null, error: null }.
 */
function createChainableNoOp(): unknown {
  const emptyResult: SupabaseResult = { data: null, error: null };
  const promise = Promise.resolve(emptyResult);

  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      // When awaited, behave like a Promise resolving to empty result
      if (prop === 'then') {
        return promise.then.bind(promise);
      }
      if (prop === 'catch') {
        return promise.catch.bind(promise);
      }
      if (prop === 'finally') {
        return promise.finally.bind(promise);
      }
      // Any other property access returns a callable that continues the chain
      return (..._args: unknown[]) => createChainableNoOp();
    },
  };

  return new Proxy({}, handler);
}

/**
 * A no-op Supabase client used when environment variables are missing
 * (e.g. during static generation at build time). All queries return
 * { data: null, error: null } instead of crashing.
 */
function createNoOpClient(): SupabaseClient {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'from' || prop === 'rpc') {
        return (..._args: unknown[]) => createChainableNoOp();
      }
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
        };
      }
      return undefined;
    },
  };
  return new Proxy({}, handler) as unknown as SupabaseClient;
}

/**
 * Check whether we are running inside a Next.js request context
 * (i.e. cookies() is available). During static generation at build
 * time, cookies() throws because there is no request scope.
 */
function hasRequestContext(): boolean {
  try {
    cookies();
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a Supabase client that reads auth state from Next.js cookies.
 *
 * Must be called inside a Server Component or Server Action where
 * `next/headers` cookies() is available. The client automatically
 * handles session refresh and cookie updates.
 *
 * Falls back to a no-op client when called outside a request context
 * or when environment variables are missing (e.g. during static
 * generation at build time).
 *
 * @returns A Supabase client instance.
 */
export function createServerClient(): SupabaseClient {
  // When env vars are missing (build time), return a no-op client
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return createNoOpClient();
  }

  // During static generation (build time) there is no request context,
  // so cookies() would throw. Fall back to a plain client.
  if (!hasRequestContext()) {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  const cookieStore = cookies();

  return createSSRClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions — the middleware handles cookie writes.
        }
      },
    },
  });
}
