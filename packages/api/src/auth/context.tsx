import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithProvider as authSignInWithProvider,
  signOut as authSignOut,
  getSession as authGetSession,
  onAuthStateChange,
} from './functions';
import type { AuthUser } from './functions';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

export interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof onAuthStateChange> | null>(null);

  // ----- Initialise session on mount -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { session: existingSession, error: sessionError } =
        await authGetSession();

      if (cancelled) return;

      if (sessionError) {
        setError(sessionError);
        setLoading(false);
        return;
      }

      if (existingSession) {
        setSession(existingSession);
        setUser(mapSessionToUser(existingSession));
      }
      setLoading(false);
    })();

    // ----- Subscribe to auth state changes -----
    subscriptionRef.current = onAuthStateChange(
      (_event: string, newSession: Session | null) => {
        if (cancelled) return;
        setSession(newSession);
        setUser(newSession ? mapSessionToUser(newSession) : null);
        setError(null);
      },
    );

    return () => {
      cancelled = true;
      subscriptionRef.current?.subscription?.unsubscribe();
    };
  }, []);

  // ----- Auth actions -----

  const signUp = useCallback(
    async (email: string, password: string, name: string) => {
      setLoading(true);
      setError(null);
      const result = await authSignUp(email, password, name);
      if (result.error) {
        setError(result.error);
      } else {
        setUser(result.user);
        setSession(result.session);
      }
      setLoading(false);
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      setError(null);
      const result = await authSignIn(email, password);
      if (result.error) {
        setError(result.error);
      } else {
        setUser(result.user);
        setSession(result.session);
      }
      setLoading(false);
    },
    [],
  );

  const handleSignInWithProvider = useCallback(
    async (provider: 'google' | 'apple') => {
      setLoading(true);
      setError(null);
      const result = await authSignInWithProvider(provider);
      if (result.error) {
        setError(result.error);
      }
      // For OAuth the session is established after the redirect –
      // onAuthStateChange will pick it up.
      setLoading(false);
    },
    [],
  );

  const handleSignOut = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await authSignOut();
    if (result.error) {
      setError(result.error);
    } else {
      setUser(null);
      setSession(null);
    }
    setLoading(false);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithProvider: handleSignInWithProvider,
    signOut: handleSignOut,
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
