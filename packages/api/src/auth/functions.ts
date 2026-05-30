import { supabase } from './client';
import type { Session, AuthError, Provider } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface AuthResult {
  user: AuthUser | null;
  session: Session | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapAuthError(error: AuthError): string {
  return error.message ?? 'An authentication error occurred';
}

function toAuthUser(data: any): AuthUser | null {
  if (!data?.user) return null;
  const meta = data.user.user_metadata ?? {};
  return {
    id: data.user.id,
    email: data.user.email ?? '',
    name: meta.full_name ?? meta.name ?? data.user.email?.split('@')[0] ?? '',
    avatarUrl: meta.avatar_url ?? meta.picture ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// signUp – creates auth user + profiles row
// ---------------------------------------------------------------------------

export async function signUp(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
    },
  });

  if (error) {
    return { user: null, session: null, error: mapAuthError(error) };
  }

  // Insert a row in the profiles table (best-effort; the DB trigger may
  // already handle this, but we ensure it exists).
  if (data.user) {
    const profileError = await ensureProfile(data.user.id, name, email);
    if (profileError) {
      // Non-fatal – the user is still created in auth; log and continue.
      console.warn('[MealMe] Failed to create profile row:', profileError);
    }
  }

  return {
    user: toAuthUser(data),
    session: data.session,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// signIn
// ---------------------------------------------------------------------------

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, session: null, error: mapAuthError(error) };
  }

  return {
    user: toAuthUser(data),
    session: data.session,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// signInWithProvider – OAuth redirect (Google / Apple)
// ---------------------------------------------------------------------------

export async function signInWithProvider(
  provider: 'google' | 'apple',
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,
    options: {
      redirectTo: getRedirectUrl(),
    },
  });

  if (error) {
    return { error: mapAuthError(error) };
  }
  return { error: null };
}

// ---------------------------------------------------------------------------
// signOut
// ---------------------------------------------------------------------------

export async function signOut(): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return { error: mapAuthError(error) };
  }
  return { error: null };
}

// ---------------------------------------------------------------------------
// getSession
// ---------------------------------------------------------------------------

export async function getSession(): Promise<{
  session: Session | null;
  error: string | null;
}> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { session: null, error: mapAuthError(error) };
  }
  return { session: data.session, error: null };
}

// ---------------------------------------------------------------------------
// onAuthStateChange – realtime listener
// ---------------------------------------------------------------------------

import type { Subscription } from '@supabase/supabase-js';

export type AuthStateCallback = (
  event: string,
  session: Session | null,
) => void;

export function onAuthStateChange(
  callback: AuthStateCallback,
): { subscription: Subscription } {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  return { subscription: data.subscription };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function ensureProfile(
  userId: string,
  name: string,
  _email: string,
): Promise<string | null> {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      full_name: name,
    },
    { onConflict: 'id' },
  );
  return error?.message ?? null;
}

function getRedirectUrl(): string | undefined {
  // Expo: use a deep-link scheme; Next.js: use the current origin.
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).location !== 'undefined') {
    return (globalThis as any).location.origin as string;
  }
  // Fallback for React Native / Expo – the app should configure the
  // EXPO_PUBLIC_SUPABASE_REDIRECT_URL env var.
  return (
    process.env.EXPO_PUBLIC_SUPABASE_REDIRECT_URL ?? undefined
  );
}
