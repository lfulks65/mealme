import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithProvider as authSignInWithProvider,
  signOut as authSignOut,
  getSession as authGetSession,
  onAuthStateChange,
} from '@mealme/api';
import type { AuthUser } from '@mealme/api';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

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

function toUser(authUser: AuthUser | null): User | null {
  if (!authUser) return null;
  return {
    id: authUser.id,
    name: authUser.name,
    email: authUser.email,
    avatarUrl: authUser.avatarUrl,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof onAuthStateChange> | null>(null);

  const isAuthenticated = user !== null;

  // Check stored session on mount & subscribe to auth state changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { session: existingSession, error: sessionError } =
        await authGetSession();

      if (cancelled) return;

      if (sessionError) {
        setError(sessionError);
      } else if (existingSession) {
        setSession(existingSession);
        const meta = (existingSession.user.user_metadata ?? {}) as Record<string, any>;
        setUser({
          id: existingSession.user.id,
          name: meta.full_name ?? meta.name ?? existingSession.user.email?.split('@')[0] ?? '',
          email: existingSession.user.email ?? '',
        });
      }
      setIsLoading(false);
    })();

    subscriptionRef.current = onAuthStateChange(
      (_event: string, newSession: Session | null) => {
        if (cancelled) return;
        setSession(newSession);
        if (newSession) {
          const meta = (newSession.user.user_metadata ?? {}) as Record<string, any>;
          setUser({
            id: newSession.user.id,
            name: meta.full_name ?? meta.name ?? newSession.user.email?.split('@')[0] ?? '',
            email: newSession.user.email ?? '',
          });
        } else {
          setUser(null);
        }
        setError(null);
      },
    );

    return () => {
      cancelled = true;
      subscriptionRef.current?.subscription?.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authSignIn(email, password);
      if (result.error) {
        setError(result.error);
        throw new Error(result.error);
      }
      setUser(toUser(result.user));
      setSession(result.session);
    } catch (err: any) {
      const msg = err.message || 'Sign in failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authSignUp(email, password, name);
      if (result.error) {
        setError(result.error);
        throw new Error(result.error);
      }
      setUser(toUser(result.user));
      setSession(result.session);
    } catch (err: any) {
      const msg = err.message || 'Sign up failed';
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authSignOut();
      if (result.error) {
        setError(result.error);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch (err: any) {
      setError(err.message || 'Sign out failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      // Supabase password reset – sends a reset email via Supabase
      const { supabase } = await import('@mealme/api');
      const redirectTo = typeof globalThis !== 'undefined' && typeof (globalThis as any).location !== 'undefined'
        ? (globalThis as any).location.origin as string
        : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetError) {
        setError(resetError.message || 'Failed to send reset email');
        throw resetError;
      }
      if (!email) {
        throw new Error('Please enter your email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authSignInWithProvider('google');
      if (result.error) {
        setError(result.error);
        throw new Error(result.error);
      }
      // Session will be set via onAuthStateChange after the OAuth redirect
    } catch (err: any) {
      setError(err.message || 'Google sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authSignInWithProvider('apple');
      if (result.error) {
        setError(result.error);
        throw new Error(result.error);
      }
      // Session will be set via onAuthStateChange after the OAuth redirect
    } catch (err: any) {
      setError(err.message || 'Apple sign in failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authSignInWithProvider(provider);
      if (result.error) {
        setError(result.error);
        throw new Error(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Sign in with provider failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPasswordState = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        session,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        signInWithGoogle,
        signInWithApple,
        signInWithProvider,
        resetPasswordState,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
