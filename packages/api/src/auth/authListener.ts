import { supabase } from './client';
import type { QueryClient } from '@tanstack/react-query';
import { authKeys } from './authQueries';

/**
 * Subscribe to Supabase onAuthStateChange and invalidate React Query
 * auth queries whenever the session changes. Returns unsubscribe fn.
 */
export function startAuthListener(queryClient: QueryClient): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, _session) => {
    queryClient.invalidateQueries({ queryKey: authKeys.session });
  });
  return () => data.subscription.unsubscribe();
}
