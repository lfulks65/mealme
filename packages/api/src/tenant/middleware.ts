/**
 * @module tenant/middleware
 * Server-side tenant-scoping utility for Supabase queries.
 *
 * Provides `withTenant()` — a helper that wraps a Supabase query
 * function with tenant-scoped headers. Useful in server-side API
 * routes, server actions, or any context where the React
 * `TenantProvider` is not available.
 *
 * @example
 * ```ts
 * // In a Next.js API route:
 * const families = await withTenant('org-123', 'fam-456', (client) =>
 *   client.from('families').select('*'),
 * );
 * ```
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createTenantClient } from './client';

/**
 * Execute a Supabase query scoped to a specific tenant.
 *
 * Creates a temporary tenant-scoped Supabase client (with
 * `x-tenant-id` and optionally `x-family-id` headers) and passes
 * it to the provided query function.
 *
 * @param tenantId - The org / tenant ID (required).
 * @param familyId - The family ID (optional).
 * @param queryFn - A function that receives the scoped client and
 *                  returns a promise with the query result.
 * @returns The result of the query function.
 *
 * @example
 * ```ts
 * const result = await withTenant(
 *   'org-123',
 *   'fam-456',
 *   (client) => client.from('families').select('*'),
 * );
 * ```
 */
export async function withTenant<T>(
  tenantId: string,
  familyId: string | undefined,
  queryFn: (client: SupabaseClient) => Promise<T>,
): Promise<T> {
  const tenantClient = createTenantClient({
    'x-tenant-id': tenantId,
    ...(familyId ? { 'x-family-id': familyId } : {}),
  });
  return queryFn(tenantClient);
}
