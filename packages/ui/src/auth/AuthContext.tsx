import React, { createContext, useContext, useCallback } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { Session } from '@supabase/supabase-js';
import {
  useSession,
  useCurrentUser,
  useSignUp as useSignUpMutation,
  useSignIn as useSignInMutation,
  useSignOut as useSignOutMutation,
  useSignInWithProvider as useSignInWithProviderMutation,
  useResetPassword as useResetPasswordMutation,
  AuthQueryProvider,
} from '@mealme/api';

// ---------------------------------------------------------------------------
// Public User type (exposed to consumers of @mealme/ui)
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

// ---------------------------------------------------------------------------
// Extended context type
// ---------------------------------------------------------------------------

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  resetPasswordState: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider – wraps QueryClientProvider + AuthQueryProvider and delegates
// to React Query hooks internally
// ---------------------------------------------------------------------------

export function AuthProvider({
  children,
  queryClient,
}: {
  children: React.ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthQueryProvider queryClient={queryClient}>
        <AuthProviderInner>{children}</AuthProviderInner>
      </AuthQueryProvider>
    </QueryClientProvider>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  // ----- React Query hooks -----
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: currentUser } = useCurrentUser();

  const signUpMutation = useSignUpMutation();
  const signInMutation = useSignInMutation();
  const signOutMutation = useSignOutMutation();
  const signInWithProviderMutation = useSignInWithProviderMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  // Derive the active error from whichever mutation was used last
  const getMutationError = (mutation: { error: Error | null }): string | null =>
    mutation.error?.message ?? null;

  // ----- Derived state -----

  const user: User | null = currentUser
    ? {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatarUrl: currentUser.avatarUrl,
      }
    : null;

  const isAuthenticated = user !== null;
  const isLoading = sessionLoading;

  // ----- Reset all mutation state -----

  const resetPasswordState = useCallback(() => {
    signUpMutation.reset();
    signInMutation.reset();
    signOutMutation.reset();
    signInWithProviderMutation.reset();
    resetPasswordMutation.reset();
  }, [
    signUpMutation,
    signInMutation,
    signOutMutation,
    signInWithProviderMutation,
    resetPasswordMutation,
  ]);

  // ----- Auth actions -----
  // Each action resets all mutation state first to prevent stale errors
  // from a different auth flow from leaking into the current screen.

  const signIn = useCallback(
    async (email: string, password: string) => {
      resetPasswordState();
      await signInMutation.mutateAsync({ email, password });
    },
    [signInMutation, resetPasswordState],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      resetPasswordState();
      await signUpMutation.mutateAsync({ email, password, name });
    },
    [signUpMutation, resetPasswordState],
  );

  const signOut = useCallback(async () => {
    resetPasswordState();
    await signOutMutation.mutateAsync();
  }, [signOutMutation, resetPasswordState]);

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'apple') => {
      resetPasswordState();
      await signInWithProviderMutation.mutateAsync({ provider });
    },
    [signInWithProviderMutation, resetPasswordState],
  );

  const signInWithGoogle = useCallback(async () => {
    resetPasswordState();
    await signInWithProviderMutation.mutateAsync({ provider: 'google' });
  }, [signInWithProviderMutation, resetPasswordState]);

  const signInWithApple = useCallback(async () => {
    resetPasswordState();
    await signInWithProviderMutation.mutateAsync({ provider: 'apple' });
  }, [signInWithProviderMutation, resetPasswordState]);

  const forgotPassword = useCallback(
    async (email: string) => {
      if (!email.trim()) {
        throw new Error('Please enter your email');
      }
      resetPasswordState();
      await resetPasswordMutation.mutateAsync({ email });
    },
    [resetPasswordMutation, resetPasswordState],
  );

  // Compute the visible error from whichever mutation was used last.
  const error =
    getMutationError(signInMutation) ??
    getMutationError(signUpMutation) ??
    getMutationError(signOutMutation) ??
    getMutationError(signInWithProviderMutation) ??
    getMutationError(resetPasswordMutation);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    session: session ?? null,
    signIn,
    signUp,
    signOut,
    forgotPassword,
    signInWithGoogle,
    signInWithApple,
    signInWithProvider,
    resetPasswordState,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
