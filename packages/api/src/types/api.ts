/**
 * @module types/api
 *
 * Generic API request/response wrapper types.
 *
 * These types provide reusable wrappers for paginated responses,
 * standardised success/error envelopes, and common query parameters
 * used across all domain API modules.
 */

import type { ApiError } from '../errors';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

/** Paginated response wrapper for list endpoints. */
export interface PaginatedResponse<T> {
  /** The items on the current page. */
  data: T[];
  /** Total number of items across all pages. */
  count: number;
  /** Current page number (1-based). */
  page: number;
  /** Number of items per page. */
  pageSize: number;
  /** Total number of pages. */
  totalPages: number;
}

/** Pagination query parameters for list endpoints. */
export interface PaginationParams {
  /** Page number (1-based). Defaults to 1. */
  page?: number;
  /** Number of items per page. Defaults to 20. */
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Sorting
// ---------------------------------------------------------------------------

/** Sort direction. */
export type SortDirection = 'asc' | 'desc';

/** Sort options for list endpoints. */
export interface SortOptions {
  /** Field name to sort by. */
  field: string;
  /** Sort direction. */
  direction: SortDirection;
}

// ---------------------------------------------------------------------------
// API response envelope
// ---------------------------------------------------------------------------

/**
 * Standardised API response wrapper.
 *
 * Discriminated union: on success `data` is populated and `error` is null;
 * on failure `data` is null and `error` carries an `ApiError`.
 */
export type ApiResponse<T> =
  | { data: T; error: null }
  | { data: null; error: ApiError };
