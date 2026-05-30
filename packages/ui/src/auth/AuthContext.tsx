import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  useAuth as useApiAuth,
  AuthProvider as ApiAuthProvider,
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
// Provider – wraps the API AuthProvider and extends it
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <ApiAuthProvider>
      <AuthProviderInner>{children}</AuthProviderInner>
    </ApiAuthProvider>
  );
}

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const api = useApiAuth();

  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);

  const user: User | null = api.user
    ? {
        id: api.user.id,
        name: api.user.name,
        email: api.user.email,
        avatarUrl: api.user.avatarUrl,
      }
    : null;

  const isAuthenticated = user !== null;
  const isLoading = api.loading || forgotPasswordLoading;
  const error = api.error ?? forgotPasswordError;

  const signIn = useCallback(
    async (email: string, password: string) => {
      await api.signIn(email, password);
    },
    [api.signIn],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      await api.signUp(email, password, name);
    },
    [api.signUp],
  );

  const signOut = useCallback(async () => {
    await api.signOut();
  }, [api.signOut]);

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'apple') => {
      await api.signInWithProvider(provider);
    },
    [api.signInWithProvider],
  );

  const signInWithGoogle = useCallback(async () => {
    await api.signInWithProvider('google');
  }, [api.signInWithProvider]);

  const signInWithApple = useCallback(async () => {
    await api.signInWithProvider('apple');
  }, [api.signInWithProvider]);

  const forgotPassword = useCallback(
    async (email: string) => {
      if (!email.trim()) {
        throw new Error('Please enter your email');
      }
      setForgotPasswordLoading(true);
      setForgotPasswordError(null);
      try {
        const { supabase } = await import('@mealme/api');
        const redirectTo =
          typeof globalThis !== 'undefined' &&
          typeof (globalThis as any).location !== 'undefined'
            ? ((globalThis as any).location.origin as string)
            : undefined;
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          email,
          { redirectTo },
        );
        if (resetError) {
          setForgotPasswordError(resetError.message || 'Failed to send reset email');
          throw resetError;
        }
      } catch (err: any) {
        const msg = err.message || 'Failed to send reset email';
        setForgotPasswordError(msg);
        throw err;
      } finally {
        setForgotPasswordLoading(false);
      }
    },
    [],
  );

  const resetPasswordState = useCallback(() => {
    setForgotPasswordError(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    session: api.session,
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
