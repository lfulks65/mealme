import { supabase } from './client';
import type { Session } from '@supabase/supabase-js';

/** Check if a session's access token is expired or about to expire */
export function isSessionExpired(session: Session | null, bufferMs = 60_000): boolean {
  if (!session) return true;
  const expiresAt = session.expires_at; // Unix timestamp in seconds
  if (!expiresAt) return false; // No expiry info, assume valid
  const expiresAtMs = expiresAt * 1000;
  return Date.now() >= expiresAtMs - bufferMs;
}

/** Attempt to refresh the session. Returns refreshed session or null on failure. */
export async function refreshSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('[MealMe] Session refresh failed:', error.message);
    return null;
  }
  return data.session;
}

/** Force sign out (clears session everywhere) */
export async function forceSignOut(): Promise<void> {
  await supabase.auth.signOut({ scope: 'global' });
}
