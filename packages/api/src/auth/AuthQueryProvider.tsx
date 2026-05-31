import React, { useEffect, useRef } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { startAuthListener } from './authListener';

interface AuthQueryProviderProps {
  queryClient: QueryClient;
  children: React.ReactNode;
}

/**
 * Bridge between React Query and Supabase's realtime auth listener.
 *
 * Call `startAuthListener(queryClient)` on mount and unsubscribe on unmount.
 * This ensures that whenever Supabase reports an auth state change (sign-in,
 * sign-out, token refresh, OAuth callback), the session query is invalidated
 * so dependent components re-fetch.
 */
export function AuthQueryProvider({ queryClient, children }: AuthQueryProviderProps) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    unsubscribeRef.current = startAuthListener(queryClient);
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [queryClient]);

  return <>{children}</>;
}
