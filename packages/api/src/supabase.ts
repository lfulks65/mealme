/**
 * @module supabase
 * Supabase client initialization for the MealMe platform.
 *
 * Provides two clients:
 *   - `supabase` — standard client using the anon key (respects RLS)
 *   - `supabaseAdmin` — service-role client that bypasses RLS (server-side only)
 *
 * Environment variables (set in .env / .env.local):
 *   - SUPABASE_URL
 *   - SUPABASE_ANON_KEY
 *   - SUPABASE_SERVICE_ROLE_KEY  (optional, admin client only)
 *
 * For Expo / Next.js the public env vars are also checked:
 *   - EXPO_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL
 *   - EXPO_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment variable resolution
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  '';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// ---------------------------------------------------------------------------
// Standard client (anon key — respects RLS)
// ---------------------------------------------------------------------------

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[MealMe] Supabase environment variables are missing. ' +
      'Set SUPABASE_URL / SUPABASE_ANON_KEY (or their EXPO_PUBLIC_ / NEXT_PUBLIC_ variants).'
  );
}

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------------------------------------------------------------------
// Admin client (service role — bypasses RLS, server-side only)
// ---------------------------------------------------------------------------

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns a Supabase client initialised with the service-role key.
 * This client bypasses all Row Level Security policies and should
 * **only** be used on the server (API routes, server actions, etc.).
 *
 * Lazily created so the key is not required in client bundles that
 * never call this function.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        '[MealMe] SUPABASE_SERVICE_ROLE_KEY is required to create the admin client. ' +
          'Ensure it is set in your server-side environment.'
      );
    }
    _supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}
