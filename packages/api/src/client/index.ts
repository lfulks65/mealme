/**
 * @module client
 *
 * Barrel export for the MealMe API client system.
 *
 * Re-exports token management, tenant context, and the API client wrapper.
 */

// Token management
export { TokenManager } from './token-manager';
export type { TokenRefreshCallback } from './token-manager';

// Tenant context
export type { TenantContext } from './tenant-context';
export { TenantProvider, useTenant, createTenantHeaders, withTenantHeaders } from './tenant-context';

// API client
export { createApiClient, ApiClientProvider, useApiClient } from './api-client';
export type { ApiClient, ApiClientOptions } from './api-client';
