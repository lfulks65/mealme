/**
 * @module tenant/hooks
 * React hooks for tenant-scoped Supabase clients.
 *
 * Provides `useTenantClient()` which returns a Supabase client
 * automatically configured with the current tenant headers.
 * The client is memoised and only recreated when the tenant or
 * family ID changes.
 */

import { useMemo } from 'react';
import { useTenant } from '../client/tenant-context';
import { createTenantClient } from './client';

/**
 * Returns a Supabase client scoped to the current tenant.
 *
 * Reads the active `orgId` and `familyId` from the `TenantProvider`
 * context and creates a Supabase client that injects `x-tenant-id`
 * and `x-family-id` headers on every request.
 *
 * The client is memoised — it is only recreated when the org or
 * family ID changes, so it is safe to use in dependency arrays.
 *
 * @returns A tenant-scoped Supabase client, or `null` if no tenant
 *          context is available (i.e. the user has not selected an org).
 *
 * @example
 * ```tsx
 * function FamilyList() {
 *   const client = useTenantClient();
 *   if (!client) return <p>Select an organisation first.</p>;
 *
 *   const { data } = await client.from('families').select('*');
 *   // ...
 * }
 * ```
 */
export function useTenantClient() {
  const tenant = useTenant();

  return useMemo(() => {
    if (!tenant?.orgId) return null;

    return createTenantClient({
      'x-tenant-id': tenant.orgId,
      ...(tenant.familyId ? { 'x-family-id': tenant.familyId } : {}),
    });
  }, [tenant?.orgId, tenant?.familyId]);
}
