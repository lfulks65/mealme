/**
 * @module tenant/client
 * Factory for creating tenant-scoped Supabase clients.
 *
 * Creates a Supabase client that automatically injects `x-tenant-id`
 * and `x-family-id` as custom headers on every request. This allows
 * server-side RLS policies to read the tenant context from request
 * headers and filter rows efficiently without the client needing to
 * manually add `.eq('tenant_id', ...)` to every query.
 *
 * The headers can be read in PostgreSQL via:
 *   current_setting('request.headers', true)::json->>'x-tenant-id'
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment variable resolution (mirrors ../supabase.ts)
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Headers injected into every Supabase request for tenant scoping. */
export interface TenantHeaders {
  /** Current org / tenant ID (required). */
  'x-tenant-id': string;
  /** Current family ID (optional). */
  'x-family-id'?: string;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a Supabase client scoped to a specific tenant.
 *
 * Injects `x-tenant-id` and (optionally) `x-family-id` as custom
 * headers so that server-side RLS policies can use them for efficient
 * row-level filtering.
 *
 * @param tenantHeaders - The tenant identifiers to inject as headers.
 * @returns A new Supabase client configured with the tenant headers.
 *
 * @example
 * ```ts
 * const client = createTenantClient({
 *   'x-tenant-id': 'org-123',
 *   'x-family-id': 'fam-456',
 * });
 *
 * const { data } = await client.from('families').select('*');
 * // Every request includes x-tenant-id and x-family-id headers.
 * ```
 */
export function createTenantClient(tenantHeaders: TenantHeaders): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      '[MealMe] Cannot create tenant-scoped Supabase client: ' +
        'SUPABASE_URL / SUPABASE_ANON_KEY environment variables are missing.',
    );
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        'x-tenant-id': tenantHeaders['x-tenant-id'],
        ...(tenantHeaders['x-family-id'] ? { 'x-family-id': tenantHeaders['x-family-id'] } : {}),
      },
    },
  });
}
