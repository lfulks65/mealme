/**
 * @module client/token-manager
 *
 * Token storage and refresh management for the MealMe API client.
 *
 * `TokenManager` keeps auth tokens in memory (no localStorage — the package
 * works across React Native + web) and integrates with the Supabase auth
 * session lifecycle:
 *
 *   - On init it fetches the current session via `supabase.auth.getSession()`.
 *   - It subscribes to `onAuthStateChange` so tokens stay in sync
 *     automatically (sign-in, sign-out, refresh).
 *   - Consumers can subscribe to refresh events via `onTokenRefresh()`.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Callback invoked whenever the access token is refreshed. */
export type TokenRefreshCallback = (token: string) => void;

interface StoredToken {
  accessToken: string;
  expiresAt: number; // Unix timestamp in seconds
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Refresh the token this many seconds *before* it actually expires. */
const EXPIRY_BUFFER_SECONDS = 5 * 60; // 5 minutes

// ---------------------------------------------------------------------------
// TokenManager
// ---------------------------------------------------------------------------

/**
 * Manages auth tokens in memory with automatic Supabase session integration.
 *
 * ```ts
 * const tm = new TokenManager(supabaseClient);
 * await tm.init();
 * const token = await tm.getToken();
 * ```
 */
export class TokenManager {
  private token: StoredToken | null = null;
  private refreshCallbacks: Set<TokenRefreshCallback> = new Set();
  private supabase: SupabaseClient;
  private initialised = false;
  private unsubAuthChange: (() => void) | null = null;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /**
   * Initialise the manager — loads the current session and subscribes to
   * auth state changes.  Must be called once before `getToken()`.
   */
  async init(): Promise<void> {
    if (this.initialised) return;

    // Fetch current session
    const { data, error } = await this.supabase.auth.getSession();
    if (!error && data.session) {
      this.setTokenFromSession(data.session);
    }

    // Subscribe to future auth state changes
    const { data: listener } = this.supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          this.setTokenFromSession(session);
        } else {
          this.clearToken();
        }
      },
    );
    this.unsubAuthChange = () => listener.subscription.unsubscribe();

    this.initialised = true;
  }

  /** Tear down the auth listener. Call when the manager is no longer needed. */
  destroy(): void {
    this.unsubAuthChange?.();
    this.unsubAuthChange = null;
    this.token = null;
    this.refreshCallbacks.clear();
    this.initialised = false;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Returns the current access token, auto-refreshing if expired.
   * Returns `null` when there is no active session.
   */
  async getToken(): Promise<string | null> {
    if (!this.token) return null;

    if (this.isTokenExpired()) {
      const refreshed = await this.refreshToken();
      return refreshed;
    }

    return this.token.accessToken;
  }

  /**
   * Stores a token with its expiry time.
   * This is mainly useful for manually setting a token (e.g. during
   * testing).  In normal operation the manager is fed by Supabase auth
   * state changes.
   */
  setToken(token: string, expiresAt: number): void {
    this.token = { accessToken: token, expiresAt };
  }

  /** Removes the stored token. */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Subscribe to token refresh events.
   *
   * @returns an unsubscribe function
   */
  onTokenRefresh(callback: TokenRefreshCallback): () => void {
    this.refreshCallbacks.add(callback);
    return () => {
      this.refreshCallbacks.delete(callback);
    };
  }

  /**
   * Checks whether the current token is expired (with a 5-minute buffer).
   * Returns `true` if there is no token or it is within the buffer window.
   */
  isTokenExpired(): boolean {
    if (!this.token) return true;
    const now = Math.floor(Date.now() / 1000);
    return now >= this.token.expiresAt - EXPIRY_BUFFER_SECONDS;
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /** Extract token data from a Supabase session object. */
  private setTokenFromSession(session: {
    access_token: string;
    expires_at?: number;
  }): void {
    const expiresAt = session.expires_at ?? Math.floor(Date.now() / 1000) + 3600;
    this.token = {
      accessToken: session.access_token,
      expiresAt,
    };
  }

  /** Attempt to refresh the token via Supabase and return the new token. */
  private async refreshToken(): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.auth.refreshSession();
      if (error || !data.session) {
        // Refresh failed — clear the stale token
        this.clearToken();
        return null;
      }

      this.setTokenFromSession(data.session);

      // Notify subscribers
      const newToken = data.session.access_token;
      this.refreshCallbacks.forEach((cb) => {
        try {
          cb(newToken);
        } catch {
          // Subscriber errors must not break the refresh flow
        }
      });

      return newToken;
    } catch {
      this.clearToken();
      return null;
    }
  }
}
