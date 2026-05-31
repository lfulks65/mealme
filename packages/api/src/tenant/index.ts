/**
 * @module tenant
 * Tenant-scoped Supabase client utilities.
 *
 * Re-exports all tenant utilities for convenient access:
 *   - `createTenantClient` — factory for tenant-scoped Supabase clients
 *   - `TenantHeaders` — type for tenant header configuration
 *   - `useTenantClient` — React hook for the current tenant's client
 *   - `withTenant` — server-side query wrapper
 *   - `TenantInfo` — tenant information type
 */

export { createTenantClient } from './client';
export type { TenantHeaders } from './client';
export { useTenantClient } from './hooks';
export { withTenant } from './middleware';
export type { TenantInfo } from './types';
