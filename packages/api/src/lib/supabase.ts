/**
 * @module lib/supabase
 *
 * Re-exports the Supabase client from the main supabase module
 * for use by recipe and other domain modules.
 *
 * Provides `getSupabaseClient()` which returns the singleton anon-key client
 * (equivalent to `supabase` from `../supabase`).
 */

import { supabase } from '../supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Get the Supabase client (anon key, respects RLS). */
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

/** Reset is a no-op — the main module owns the singleton. */
export function resetSupabaseClient(): void {
  // The main supabase.ts creates the client eagerly as a module-level
  // singleton.  Resetting is not supported; tests should use vitest
  // mocks instead.
}

export type { SupabaseClient };
