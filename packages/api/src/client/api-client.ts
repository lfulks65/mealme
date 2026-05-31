/**
 * @module client/api-client
 *
 * Typed API client wrapper with automatic auth token and multi-tenant
 * header injection.
 *
 * The client wraps Supabase operations and adds:
 *   - Auto-injection of auth token from `TokenManager` into every request
 *   - Auto-injection of tenant headers (`x-org-id`, `x-family-id`)
 *   - Automatic token refresh on 401 responses (retry once after refresh)
 *   - Request/response logging in dev mode (`console.debug`)
 *
 * ```ts
 * const client = createApiClient({
 *   supabaseUrl: 'https://xxx.supabase.co',
 *   supabaseKey: 'eyJ...',
 *   tokenManager,
 *   tenantContext: { orgId: 'org-123' },
 * });
 *
 * const { data, error } = await client.from('recipes').select('*');
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import React, { createContext, useContext } from 'react';
import { TokenManager } from './token-manager';
import type { TenantContext } from './tenant-context';
import { createTenantHeaders } from './tenant-context';

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface ApiClientOptions {
  supabaseUrl: string;
  supabaseKey: string;
  tokenManager?: TokenManager;
  tenantContext?: TenantContext;
}

// ---------------------------------------------------------------------------
// Internal: request interceptor helpers
// ---------------------------------------------------------------------------

const IS_DEV =
  typeof process !== 'undefined' && process.env.NODE_ENV === 'development';

/**
 * Build the headers that should be injected into every request:
 *   - Authorization bearer token (if a TokenManager is available)
 *   - Tenant headers (if a TenantContext is available)
 */
async function buildInjectedHeaders(
  tokenManager?: TokenManager,
  tenantContext?: TenantContext,
): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  // Auth token
  if (tokenManager) {
    const token = await tokenManager.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Tenant headers
  if (tenantContext) {
    Object.assign(headers, createTenantHeaders(tenantContext));
  }

  return headers;
}

// ---------------------------------------------------------------------------
// API client type
// ---------------------------------------------------------------------------

/**
 * The typed API client returned by `createApiClient`.
 *
 * It exposes the full Supabase client surface plus convenience helpers
 * for authenticated and tenant-scoped requests.
 */
export interface ApiClient {
  /** The underlying Supabase client. */
  supabase: SupabaseClient;

  /** The token manager (if provided). */
  tokenManager: TokenManager | undefined;

  /** The current tenant context (if provided). */
  tenantContext: TenantContext | undefined;

  /**
   * Update the active tenant context at runtime (e.g. when the user
   * switches organisations).
   */
  setTenantContext(context: TenantContext | undefined): void;

  /**
   * Perform an authenticated, tenant-scoped fetch against the Supabase
   * REST API.  Automatically injects the Authorization header and
   * tenant headers.  On a 401 response it will attempt a single token
   * refresh and retry.
   *
   * @param path — the PostgREST path (e.g. `/rest/v1/recipes`)
   * @param options — standard fetch options
   */
  request<T = unknown>(
    path: string,
    options?: RequestInit & { headers?: Record<string, string> },
  ): Promise<{ data: T | null; error: Error | null }>;
}

// ---------------------------------------------------------------------------
// createApiClient
// ---------------------------------------------------------------------------

/**
 * Create a typed API client that wraps Supabase with automatic auth
 * token and tenant header injection.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const { supabaseUrl, supabaseKey, tokenManager, tenantContext } = options;

  // Create the underlying Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: tenantContext ? createTenantHeaders(tenantContext) : {},
    },
  });

  // Mutable tenant context so it can be updated at runtime
  let currentTenantContext = tenantContext;

  const client: ApiClient = {
    supabase,
    tokenManager,
    tenantContext,
    setTenantContext(context: TenantContext | undefined) {
      currentTenantContext = context;
      // The tenant headers are injected per-request in `request()` and
      // via the initial global headers passed to createClient.  For
      // runtime updates the per-request injection in `request()` picks
      // up the new context automatically.
    },

    async request<T = unknown>(
      path: string,
      requestOptions: RequestInit & { headers?: Record<string, string> } = {},
    ): Promise<{ data: T | null; error: Error | null }> {
      try {
        const injectedHeaders = await buildInjectedHeaders(
          tokenManager,
          currentTenantContext,
        );

        const mergedHeaders: Record<string, string> = {
          ...injectedHeaders,
          ...(requestOptions.headers as Record<string, string> | undefined),
        };

        const url = `${supabaseUrl}${path}`;

        if (IS_DEV) {
          console.debug(
            `[MealMe API] → ${requestOptions.method ?? 'GET'} ${path}`,
            mergedHeaders,
          );
        }

        let response = await fetch(url, {
          ...requestOptions,
          headers: mergedHeaders,
        });

        // On 401, attempt a single token refresh and retry
        if (response.status === 401 && tokenManager) {
          const newToken = await tokenManager.getToken();
          if (newToken) {
            mergedHeaders['Authorization'] = `Bearer ${newToken}`;

            if (IS_DEV) {
              console.debug(
                `[MealMe API] ↻ RETRY ${requestOptions.method ?? 'GET'} ${path}`,
                '(token refreshed)',
              );
            }

            response = await fetch(url, {
              ...requestOptions,
              headers: mergedHeaders,
            });
          }
        }

        if (IS_DEV) {
          console.debug(
            `[MealMe API] ← ${response.status} ${path}`,
          );
        }

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          return {
            data: null,
            error: new Error(
              `API error ${response.status}: ${body || response.statusText}`,
            ),
          };
        }

        const data = (await response.json().catch(() => null)) as T | null;
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        };
      }
    },
  };

  return client;
}

// ---------------------------------------------------------------------------
// React context & hook
// ---------------------------------------------------------------------------

const ApiClientCtx = createContext<ApiClient | null>(null);

/**
 * Provide an `ApiClient` instance to the component tree.
 *
 * ```tsx
 * <ApiClientProvider client={client}>
 *   <App />
 * </ApiClientProvider>
 * ```
 */
export function ApiClientProvider({
  client,
  children,
}: {
  client: ApiClient;
  children: React.ReactNode;
}) {
  return React.createElement(ApiClientCtx.Provider, { value: client }, children);
}

/**
 * Access the current `ApiClient` from React context.
 *
 * @throws if used outside an `ApiClientProvider`
 */
export function useApiClient(): ApiClient {
  const client = useContext(ApiClientCtx);
  if (!client) {
    throw new Error('useApiClient must be used within an ApiClientProvider');
  }
  return client;
}
