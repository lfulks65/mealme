/**
 * @module errors/handlers
 *
 * Utility functions for working with Supabase results and API errors.
 *
 * - `handleSupabaseError` — unwrap a `{ data, error }` result, throwing on error.
 * - `wrapApiCall` — catch errors and return a safe `{ data, error }` tuple.
 * - `getErrorMessage` — extract a human-readable string from any thrown value.
 */

import {
  ApiError,
  NetworkError,
  isApiError,
} from './api-error';
import type { SupabaseError } from './api-error';

// ---------------------------------------------------------------------------
// handleSupabaseError
// ---------------------------------------------------------------------------

/**
 * Unwrap a Supabase `{ data, error }` result.
 *
 * - If `error` is present, it is mapped to the appropriate `ApiError`
 *   subclass via `ApiError.fromSupabaseError` and **thrown**.
 * - If `data` is `null` (but no error), a `NotFoundError` is thrown.
 * - Otherwise `data` is returned.
 *
 * @example
 * ```ts
 * const recipe = handleSupabaseError(
 *   await supabase.from('recipes').select('*').eq('id', id).single()
 * );
 * ```
 */
export function handleSupabaseError<T>(
  result: { data: T | null; error: SupabaseError | null },
): T {
  const { data, error } = result;

  if (error) {
    throw ApiError.fromSupabaseError(error);
  }

  if (data === null || data === undefined) {
    throw new NetworkError('No data returned from the server');
  }

  return data;
}

// ---------------------------------------------------------------------------
// wrapApiCall
// ---------------------------------------------------------------------------

/**
 * Wrap an async function so it **never throws**.
 *
 * Returns `{ data, error }` where `error` is `null` on success and an
 * `ApiError` instance on failure.
 *
 * @example
 * ```ts
 * const { data, error } = await wrapApiCall(() =>
 *   supabase.from('recipes').select('*').eq('id', id).single()
 * );
 * if (error) { /* handle *\/ }
 * ```
 */
export async function wrapApiCall<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; error: null } | { data: null; error: ApiError }> {
  try {
    const data = await fn();
    return { data, error: null };
  } catch (e: unknown) {
    if (isApiError(e)) {
      return { data: null, error: e };
    }
    // Wrap unexpected errors in a generic ApiError
    const message =
      e instanceof Error ? e.message : String(e);
    return {
      data: null,
      error: new ApiError(message, 'UNKNOWN_ERROR', 0, {
        originalError: e,
      }),
    };
  }
}

// ---------------------------------------------------------------------------
// getErrorMessage
// ---------------------------------------------------------------------------

/**
 * Extract a human-readable message from any thrown value.
 *
 * Handles:
 * - `ApiError` → `error.message`
 * - Native `Error` → `error.message`
 * - Strings → returned as-is
 * - Everything else → `String(value)`
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}
