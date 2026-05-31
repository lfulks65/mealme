import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
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
import { isSessionExpired, refreshSession, forceSignOut } from './sessionManager';

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
  clearError: () => void;
  error: string | null;
  sessionExpiry: number | null; // Unix timestamp (ms) when current session expires
  isSessionExpired: boolean; // Whether session is expired or about to expire
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/** Interval for periodic session expiry checks (5 minutes) */
const SESSION_CHECK_INTERVAL_MS = 5 * 60 * 1000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof onAuthStateChange> | null>(null);

  // Derived session expiry state
  const sessionExpiry = useMemo<number | null>(() => {
    if (!session?.expires_at) return null;
    return session.expires_at * 1000; // convert seconds → ms
  }, [session]);

  const isSessionExpiredFlag = useMemo(() => {
    return isSessionExpired(session);
  }, [session]);

  // ----- Initialise session on mount -----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { session: existingSession, error: sessionError } = await authGetSession();

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
    subscriptionRef.current = onAuthStateChange((event: string, newSession: Session | null) => {
      if (cancelled) return;

      switch (event) {
        case 'TOKEN_REFRESHED':
          // Session was refreshed — update state
          setSession(newSession);
          setUser(newSession ? mapSessionToUser(newSession) : null);
          setError(null);
          break;

        case 'SIGNED_OUT':
          // Session invalidated (refresh failure, server-side revocation, etc.)
          setUser(null);
          setSession(null);
          setError(null);
          setLoading(false);
          break;

        case 'USER_DELETED':
          // User account deleted — same as signed out
          setUser(null);
          setSession(null);
          setError(null);
          setLoading(false);
          break;

        default:
          // All other events (SIGNED_IN, INITIAL_SESSION, etc.)
          setSession(newSession);
          setUser(newSession ? mapSessionToUser(newSession) : null);
          setError(null);
          break;
      }
    });

    return () => {
      cancelled = true;
      subscriptionRef.current?.subscription?.unsubscribe();
    };
  }, []);

  // ----- Periodic session check (every 5 minutes) -----
  useEffect(() => {
    const interval = setInterval(async () => {
      // Only check if we have a session
      if (!session) return;

      if (isSessionExpired(session)) {
        const refreshed = await refreshSession();
        if (!refreshed) {
          // Refresh failed — force sign out; route guards will redirect to login
          console.warn('[MealMe] Session expired and refresh failed. Signing out.');
          await forceSignOut();
        }
      }
    }, SESSION_CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [session]);

  // ----- Auth actions -----

  const signUp = useCallback(async (email: string, password: string, name: string) => {
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
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
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
  }, []);

  const handleSignInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    setLoading(true);
    setError(null);
    const result = await authSignInWithProvider(provider);
    if (result.error) {
      setError(result.error);
    }
    // For OAuth the session is established after the redirect –
    // onAuthStateChange will pick it up.
    setLoading(false);
  }, []);

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

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signInWithProvider: handleSignInWithProvider,
    signOut: handleSignOut,
    clearError,
    error,
    sessionExpiry,
    isSessionExpired: isSessionExpiredFlag,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook that tracks whether the current session is about to expire.
 * Returns `{ isExpiring: true }` when the session will expire within
 * the next 5 minutes.
 */
export function useSessionExpiry() {
  const { session, loading } = useAuth();
  const [isExpiring, setIsExpiring] = useState(false);

  useEffect(() => {
    if (!session || loading) {
      setIsExpiring(false);
      return;
    }

    const expiresAt = session.expires_at;
    if (!expiresAt) return;

    const expiresAtMs = expiresAt * 1000;
    const bufferMs = 5 * 60 * 1000; // 5 minute warning
    const timeUntilExpiry = expiresAtMs - Date.now();

    if (timeUntilExpiry <= bufferMs) {
      setIsExpiring(true);
      return;
    }

    setIsExpiring(false);

    const timer = setTimeout(() => {
      setIsExpiring(true);
    }, timeUntilExpiry - bufferMs);

    return () => clearTimeout(timer);
  }, [session, loading]);

  return { isExpiring };
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
