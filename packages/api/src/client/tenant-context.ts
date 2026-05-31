/**
 * @module client/tenant-context
 *
 * Multi-tenant header injection for the MealMe API client.
 *
 * Provides:
 *   - `TenantContext` type — identifies the active organisation and
 *     (optionally) family.
 *   - `TenantProvider` / `useTenant()` — React context for the current
 *     tenant.
 *   - `createTenantHeaders()` / `withTenantHeaders()` — pure helpers that
 *     build `x-org-id` / `x-family-id` headers for any request.
 */

import React, { createContext, useContext } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Identifies the active tenant (organisation + optional family). */
export interface TenantContext {
  orgId: string;
  familyId?: string;
}

// ---------------------------------------------------------------------------
// React context
// ---------------------------------------------------------------------------

const TenantCtx = createContext<TenantContext | null>(null);

/**
 * Provide the current tenant context to the component tree.
 *
 * ```tsx
 * <TenantProvider value={{ orgId: 'org-123', familyId: 'fam-456' }}>
 *   <App />
 * </TenantProvider>
 * ```
 */
export function TenantProvider({
  value,
  children,
}: {
  value: TenantContext | null;
  children: React.ReactNode;
}) {
  return React.createElement(TenantCtx.Provider, { value }, children);
}

/**
 * Access the current tenant context.
 *
 * @throws if used outside a `TenantProvider`
 */
export function useTenant(): TenantContext | null {
  const ctx = useContext(TenantCtx);
  return ctx;
}

// ---------------------------------------------------------------------------
// Header helpers
// ---------------------------------------------------------------------------

/**
 * Build the multi-tenant headers for a given tenant context.
 *
 * ```ts
 * createTenantHeaders({ orgId: 'org-123', familyId: 'fam-456' })
 * // → { 'x-org-id': 'org-123', 'x-family-id': 'fam-456' }
 * ```
 */
export function createTenantHeaders(
  context: TenantContext,
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-org-id': context.orgId,
  };

  if (context.familyId) {
    headers['x-family-id'] = context.familyId;
  }

  return headers;
}

/**
 * Merge tenant headers into a request options object.
 *
 * If `context` is `null`, the request is returned unchanged.
 * Existing headers on the request are preserved; tenant headers are
 * added (overwriting any conflicting keys).
 *
 * ```ts
 * withTenantHeaders(
 *   { orgId: 'org-123' },
 *   { method: 'GET', headers: { accept: 'application/json' } },
 * )
 * // → { method: 'GET', headers: { accept: 'application/json', 'x-org-id': 'org-123' } }
 * ```
 */
export function withTenantHeaders<T extends { headers?: Record<string, string> }>(
  context: TenantContext | null,
  request: T,
): T {
  if (!context) return request;

  const tenantHeaders = createTenantHeaders(context);
  return {
    ...request,
    headers: {
      ...request.headers,
      ...tenantHeaders,
    },
  };
}
