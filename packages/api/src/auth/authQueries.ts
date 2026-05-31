import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './client';
import type { Session } from '@supabase/supabase-js';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithProvider as authSignInWithProvider,
  signOut as authSignOut,
  resetPasswordForEmail as authResetPasswordForEmail,
} from './functions';
import type { AuthUser } from './functions';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const authKeys = {
  session: ['auth', 'session'] as const,
  user: ['auth', 'user'] as const,
};

// ---------------------------------------------------------------------------
// useSession — reads current session (cached, auto-invalidated by listener)
// ---------------------------------------------------------------------------

export function useSession() {
  return useQuery({
    queryKey: authKeys.session,
    queryFn: () => supabase.auth.getSession().then((r) => r.data.session),
    staleTime: Infinity, // managed by listener, not by staleTime
  });
}

// ---------------------------------------------------------------------------
// useCurrentUser — derived from session
// ---------------------------------------------------------------------------

export function useCurrentUser() {
  const { data: session, ...rest } = useSession();

  const user: AuthUser | null = session ? mapSessionToUser(session) : null;

  return { data: user, ...rest };
}

// ---------------------------------------------------------------------------
// useSignUp mutation
// ---------------------------------------------------------------------------

export function useSignUp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      const result = await authSignUp(email, password, name);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

// ---------------------------------------------------------------------------
// useSignIn mutation
// ---------------------------------------------------------------------------

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await authSignIn(email, password);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session });
      // Invalidate all queries to refetch user-scoped data for the new session
      queryClient.invalidateQueries();
    },
  });
}

// ---------------------------------------------------------------------------
// useSignInWithProvider mutation
// ---------------------------------------------------------------------------

export function useSignInWithProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ provider }: { provider: 'google' | 'apple' }) => {
      const result = await authSignInWithProvider(provider);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      // The actual session will be established after the OAuth redirect;
      // the auth listener will pick it up and invalidate the cache.
      queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

// ---------------------------------------------------------------------------
// useSignOut mutation
// ---------------------------------------------------------------------------

export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await authSignOut();
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// ---------------------------------------------------------------------------
// useResetPassword mutation
// ---------------------------------------------------------------------------

export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const result = await authResetPasswordForEmail(email);
      if (result.error) {
        throw new Error(result.error);
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.session });
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapSessionToUser(session: Session): AuthUser {
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? '',
    name: meta.full_name ?? meta.name ?? session.user.email?.split('@')[0] ?? '',
    avatarUrl: meta.avatar_url ?? meta.picture ?? undefined,
  };
}
