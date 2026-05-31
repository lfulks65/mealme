import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SecureStorageAdapter } from './secureStorage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[MealMe] Supabase environment variables are missing. ' +
      'Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      'or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

/**
 * Lazily-created Supabase client. The client is only instantiated when
 * first accessed, so that missing env vars don't crash module import
 * (e.g. during Next.js static generation at build time).
 */
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        '[MealMe] Cannot create Supabase client: environment variables are missing. ' +
          'Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
          'or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.',
      );
    }
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: SecureStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
}

/** @deprecated Use getSupabase() for lazy initialization. Kept for backward compat. */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    // Forward all property accesses to the lazily-created real client
    const client = SUPABASE_URL && SUPABASE_ANON_KEY ? getSupab() : createNoOp();
    const value = (client as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

function getSupab(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return createNoOp();
  }
  if (!_supabase) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: SecureStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
}

function createNoOp(): SupabaseClient {
  const emptyResult = { data: null, error: null };
  const promise = Promise.resolve(emptyResult);

  const chainHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') return promise.then.bind(promise);
      if (prop === 'catch') return promise.catch.bind(promise);
      if (prop === 'finally') return promise.finally.bind(promise);
      return (..._args: unknown[]) => new Proxy({}, chainHandler);
    },
  };

  const clientHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'from' || prop === 'rpc') {
        return (..._args: unknown[]) => new Proxy({}, chainHandler);
      }
      if (prop === 'auth') {
        return {
          getSession: () => Promise.resolve({ data: { session: null }, error: null }),
          getUser: () => Promise.resolve({ data: { user: null }, error: null }),
          signInWithPassword: () =>
            Promise.resolve({ data: { user: null, session: null }, error: null }),
          signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
          signOut: () => Promise.resolve({ error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        };
      }
      return undefined;
    },
  };

  return new Proxy({}, clientHandler) as unknown as SupabaseClient;
}
