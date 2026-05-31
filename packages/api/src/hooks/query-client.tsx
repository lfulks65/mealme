/**
 * @module hooks/query-client
 * React Query client setup for the MealMe API package.
 *
 * Provides:
 *   - `createQueryClient()` factory with sensible defaults
 *   - `QueryClientProvider` wrapper component
 *   - `useQueryClient()` hook to access the client
 */

import React, { useState } from 'react';
import {
  QueryClient,
  QueryClientProvider as TanstackQueryClientProvider,
  useQueryClient as useTanstackQueryClient,
} from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new QueryClient with sensible defaults for the MealMe app.
 *
 * Defaults:
 *   - staleTime: 5 minutes (data is fresh for 5 min before refetch)
 *   - retry: 1 (only retry once on failure)
 *   - refetchOnWindowFocus: false (avoid surprising refetches on mobile)
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * QueryClientProvider wrapper that lazily creates a QueryClient
 * and provides it to the React tree.
 *
 * Usage:
 * ```tsx
 * <QueryClientProvider>
 *   <App />
 * </QueryClientProvider>
 * ```
 */
export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <TanstackQueryClientProvider client={queryClient}>
      {children}
    </TanstackQueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the QueryClient provided by QueryClientProvider.
 *
 * Must be used within a <QueryClientProvider>.
 */
export function useQueryClient(): QueryClient {
  return useTanstackQueryClient();
}
