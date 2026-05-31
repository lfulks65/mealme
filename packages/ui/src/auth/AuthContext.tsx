import React, { createContext, useContext, useCallback, useRef } from 'react';
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

  // Track the most recent mutation error so consumers see a single `error`
  const activeErrorRef = useRef<string | null>(null);

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

  // ----- Auth actions -----

  const signIn = useCallback(
    async (email: string, password: string) => {
      activeErrorRef.current = null;
      await signInMutation.mutateAsync({ email, password });
    },
    [signInMutation],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      activeErrorRef.current = null;
      await signUpMutation.mutateAsync({ email, password, name });
    },
    [signUpMutation],
  );

  const signOut = useCallback(async () => {
    activeErrorRef.current = null;
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'apple') => {
      activeErrorRef.current = null;
      await signInWithProviderMutation.mutateAsync({ provider });
    },
    [signInWithProviderMutation],
  );

  const signInWithGoogle = useCallback(async () => {
    activeErrorRef.current = null;
    await signInWithProviderMutation.mutateAsync({ provider: 'google' });
  }, [signInWithProviderMutation]);

  const signInWithApple = useCallback(async () => {
    activeErrorRef.current = null;
    await signInWithProviderMutation.mutateAsync({ provider: 'apple' });
  }, [signInWithProviderMutation]);

  const forgotPassword = useCallback(
    async (email: string) => {
      if (!email.trim()) {
        throw new Error('Please enter your email');
      }
      activeErrorRef.current = null;
      await resetPasswordMutation.mutateAsync({ email });
    },
    [resetPasswordMutation],
  );

  const resetPasswordState = useCallback(() => {
    activeErrorRef.current = null;
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

  // Compute the visible error: prefer the most recent mutation error,
  // falling back to any error stored in the ref.
  const error =
    getMutationError(signInMutation) ??
    getMutationError(signUpMutation) ??
    getMutationError(signOutMutation) ??
    getMutationError(signInWithProviderMutation) ??
    getMutationError(resetPasswordMutation) ??
    activeErrorRef.current;

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
