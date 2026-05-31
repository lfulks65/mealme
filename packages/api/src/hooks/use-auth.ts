/**
 * @module hooks/use-auth
 * React Query hooks for auth domain functions.
 *
 * Re-exports the `useAuth` hook from the auth context and provides
 * React Query mutations for sign-up, sign-in, and sign-out.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
} from '../auth/functions';
import type { AuthResult } from '../auth/functions';

// Re-export useAuth from the auth context
export { useAuth } from '../auth/context';
export type { AuthContextType } from '../auth/context';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const authKeys = {
  all: ['auth'] as const,
  session: () => [...authKeys.all, 'session'] as const,
};

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Sign up mutation wrapping the auth signUp function.
 *
 * On success, invalidates the session query so the new user
 * is reflected in cached data.
 */
export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation<
    AuthResult,
    Error,
    { email: string; password: string; name: string }
  >({
    mutationFn: ({ email, password, name }) => authSignUp(email, password, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

/**
 * Sign in mutation wrapping the auth signIn function.
 *
 * On success, invalidates the session query and all domain caches
 * so the new user's data is fetched.
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation<
    AuthResult,
    Error,
    { email: string; password: string }
  >({
    mutationFn: ({ email, password }) => authSignIn(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
      // Invalidate all queries to refetch user-scoped data
      queryClient.invalidateQueries();
    },
  });
}

/**
 * Sign out mutation wrapping the auth signOut function.
 *
 * On success, clears the entire React Query cache and invalidates
 * the session so stale user data is not retained.
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authSignOut(),
    onSuccess: () => {
      // Clear all cached data on sign-out
      queryClient.clear();
    },
  });
}
