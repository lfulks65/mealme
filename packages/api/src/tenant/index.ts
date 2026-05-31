/**
 * @module tenant
 * Tenant-scoped Supabase client utilities and React context.
 *
 * Re-exports all tenant utilities for convenient access:
 *   - `TenantProvider` / `useTenant` / `useTenantHeaders` — React context
 *     for tenant/family selection with persistence
 *   - `TenantContextType` — type for the tenant context
 *   - `createTenantClient` — factory for tenant-scoped Supabase clients
 *   - `TenantHeaders` — type for tenant header configuration
 *   - `useTenantClient` — React hook for the current tenant's client
 *   - `withTenant` — server-side query wrapper
 *   - `TenantInfo` — tenant information type
 */

export { TenantProvider, TenantContext, useTenant, useTenantHeaders } from './context';
export type { TenantContextType } from './context';
export { createTenantClient } from './client';
export type { TenantHeaders } from './client';
export { useTenantClient } from './hooks';
export { withTenant } from './middleware';
export type { TenantInfo } from './types';
