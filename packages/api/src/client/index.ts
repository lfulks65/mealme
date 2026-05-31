/**
 * @module client
 *
 * Barrel export for the MealMe API client system.
 *
 * Re-exports token management, tenant context, and the API client wrapper.
 *
 * Note: `TenantProvider`, `useTenant`, and `TenantContextType` are now
 * provided by `../tenant/context` (with persistence). The legacy
 * `client/tenant-context` still exports `createTenantHeaders` and
 * `withTenantHeaders` as pure utility helpers.
 */

// Token management
export { TokenManager } from './token-manager';
export type { TokenRefreshCallback } from './token-manager';

// Tenant context — legacy header helpers only.
// TenantProvider / useTenant are now in ../tenant/context (with persistence).
export { createTenantHeaders, withTenantHeaders } from './tenant-context';
export type { TenantContext as LegacyTenantContext } from './tenant-context';

// API client
export { createApiClient, ApiClientProvider, useApiClient } from './api-client';
export type { ApiClient, ApiClientOptions } from './api-client';
