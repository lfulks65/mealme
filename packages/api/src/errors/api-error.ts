/**
 * @module errors/api-error
 *
 * Core error class hierarchy for the MealMe API client.
 *
 * Every API-layer error extends `ApiError`, which itself extends the native
 * `Error`.  Each subclass carries a `code`, `status`, optional `details`,
 * and a `timestamp` so callers can inspect and react to failures
 * programmatically.
 *
 * Subclasses also expose a static `fromSupabaseError` factory that maps
 * Supabase / PostgREST error codes to the most specific ApiError subclass.
 */

// ---------------------------------------------------------------------------
// Supabase error shape
// ---------------------------------------------------------------------------

/**
 * Minimal representation of a Supabase / PostgREST error object.
 * We define our own interface so the module doesn't need a hard import on
 * `@supabase/supabase-js` just for the type.
 */
export interface SupabaseError {
  message: string;
  code?: string;
  status?: number;
  details?: string;
  hint?: string;
}

// ---------------------------------------------------------------------------
// Base class
// ---------------------------------------------------------------------------

/**
 * Base error for all API-layer failures.
 *
 * @example
 * ```ts
 * try {
 *   await someApiCall();
 * } catch (e) {
 *   if (isApiError(e)) {
 *     console.log(e.code, e.status, e.timestamp);
 *   }
 * }
 * ```
 */
export class ApiError extends Error {
  /** Machine-readable error code (e.g. 'AUTH_TOKEN_EXPIRED', 'VALIDATION_ERROR'). */
  readonly code: string;
  /** HTTP status code (0 for network-level failures). */
  readonly status: number;
  /** Arbitrary extra context supplied by the server or caller. */
  readonly details?: unknown;
  /** When the error was created. */
  readonly timestamp: Date;

  constructor(
    message: string,
    code: string,
    status: number,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date();

    // Restore the prototype chain that is broken by extending built-ins.
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Map a Supabase / PostgREST error to the most appropriate `ApiError`
   * subclass.  Falls back to a generic `ApiError` when no more specific
   * mapping applies.
   */
  static fromSupabaseError(error: SupabaseError): ApiError {
    const code = error.code ?? '';
    const status = error.status ?? 0;

    // --- PostgREST / Supabase specific codes ---
    // PGRST116 — "JSON object requested, .single() was used but 0 rows found"
    if (code === 'PGRST116') {
      return new NotFoundError('resource', 'unknown', {
        supabaseMessage: error.message,
        supabaseDetails: error.details,
        supabaseHint: error.hint,
      });
    }

    // 42501 — PostgreSQL insufficient privilege
    if (code === '42501') {
      return new AuthError(error.message, 'INSUFFICIENT_PRIVILEGE', 403, {
        supabaseCode: code,
        supabaseDetails: error.details,
        supabaseHint: error.hint,
      });
    }

    // 23505 — unique_violation
    if (code === '23505') {
      return new ValidationError(
        error.message,
        'UNIQUE_VIOLATION',
        undefined,
        { supabaseCode: code, supabaseDetails: error.details, supabaseHint: error.hint },
      );
    }

    // 23503 — foreign_key_violation
    if (code === '23503') {
      return new ValidationError(
        error.message,
        'FOREIGN_KEY_VIOLATION',
        undefined,
        { supabaseCode: code, supabaseDetails: error.details, supabaseHint: error.hint },
      );
    }

    // 23514 — check_violation
    if (code === '23514') {
      return new ValidationError(
        error.message,
        'CHECK_VIOLATION',
        undefined,
        { supabaseCode: code, supabaseDetails: error.details, supabaseHint: error.hint },
      );
    }

    // --- Status-based fallbacks ---
    if (status === 401) {
      return new AuthError(error.message, 'UNAUTHORIZED', 401, {
        supabaseCode: code,
        supabaseDetails: error.details,
        supabaseHint: error.hint,
      });
    }

    if (status === 403) {
      return new AuthError(error.message, 'FORBIDDEN', 403, {
        supabaseCode: code,
        supabaseDetails: error.details,
        supabaseHint: error.hint,
      });
    }

    if (status === 404) {
      return new NotFoundError('resource', 'unknown', {
        supabaseMessage: error.message,
        supabaseDetails: error.details,
        supabaseHint: error.hint,
      });
    }

    if (status === 400) {
      return new ValidationError(
        error.message,
        'BAD_REQUEST',
        undefined,
        { supabaseCode: code, supabaseDetails: error.details, supabaseHint: error.hint },
      );
    }

    if (status >= 500) {
      return new ServerError(error.message, {
        supabaseCode: code,
        supabaseStatus: status,
        supabaseDetails: error.details,
        supabaseHint: error.hint,
      });
    }

    // Generic fallback
    return new ApiError(error.message, code || 'UNKNOWN_ERROR', status, {
      supabaseCode: code,
      supabaseDetails: error.details,
      supabaseHint: error.hint,
    });
  }
}

// ---------------------------------------------------------------------------
// Subclasses
// ---------------------------------------------------------------------------

/**
 * Authentication / authorisation failure (401 / 403).
 *
 * Typical causes: expired JWT, missing session, insufficient role.
 */
export class AuthError extends ApiError {
  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    status: number = 401,
    details?: unknown,
  ) {
    super(message, code, status, details);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromSupabaseError(error: SupabaseError): AuthError {
    const mapped = ApiError.fromSupabaseError(error);
    if (mapped instanceof AuthError) return mapped;
    // Coerce to AuthError if the base factory didn't produce one
    return new AuthError(mapped.message, mapped.code, mapped.status, mapped.details);
  }
}

/**
 * Validation failure (400).
 *
 * Carries an optional `fields` map where keys are field names and values
 * are arrays of per-field error messages.
 */
export class ValidationError extends ApiError {
  /** Per-field validation messages, e.g. `{ email: ['already taken'] }`. */
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    fields?: Record<string, string[]>,
    details?: unknown,
  ) {
    super(message, code, 400, details);
    this.name = 'ValidationError';
    this.fields = fields;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromSupabaseError(error: SupabaseError): ValidationError {
    const mapped = ApiError.fromSupabaseError(error);
    if (mapped instanceof ValidationError) return mapped;
    return new ValidationError(mapped.message, mapped.code, undefined, mapped.details);
  }
}

/**
 * Resource not found (404).
 */
export class NotFoundError extends ApiError {
  /** The type of resource that was not found (e.g. 'recipe', 'user'). */
  readonly resource: string;
  /** The identifier that was looked up. */
  readonly id: string;

  constructor(
    resource: string,
    id: string,
    details?: unknown,
  ) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
    this.resource = resource;
    this.id = id;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromSupabaseError(error: SupabaseError): NotFoundError {
    const mapped = ApiError.fromSupabaseError(error);
    if (mapped instanceof NotFoundError) return mapped;
    return new NotFoundError('resource', 'unknown', mapped.details);
  }
}

/**
 * Network / connectivity failure (status = 0).
 *
 * Indicates the request never reached the server (offline, DNS failure,
 * CORS block, etc.).
 */
export class NetworkError extends ApiError {
  constructor(
    message: string = 'Network error — request could not reach the server',
    details?: unknown,
  ) {
    super(message, 'NETWORK_ERROR', 0, details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromSupabaseError(_error: SupabaseError): NetworkError {
    return new NetworkError();
  }
}

/**
 * Server-side error (5xx).
 */
export class ServerError extends ApiError {
  constructor(
    message: string = 'Internal server error',
    details?: unknown,
  ) {
    super(message, 'SERVER_ERROR', 500, details);
    this.name = 'ServerError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromSupabaseError(error: SupabaseError): ServerError {
    const mapped = ApiError.fromSupabaseError(error);
    if (mapped instanceof ServerError) return mapped;
    return new ServerError(mapped.message, mapped.details);
  }
}

/**
 * Multi-tenant access denied (403 with a tenant-specific code).
 *
 * Raised when a user attempts to access a resource that belongs to a
 * different tenant / organisation.
 */
export class TenantError extends ApiError {
  constructor(
    message: string = 'Access denied — tenant mismatch',
    code: string = 'TENANT_ACCESS_DENIED',
    details?: unknown,
  ) {
    super(message, code, 403, details);
    this.name = 'TenantError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static fromSupabaseError(error: SupabaseError): TenantError {
    const mapped = ApiError.fromSupabaseError(error);
    if (mapped instanceof TenantError) return mapped;
    return new TenantError(mapped.message, mapped.code, mapped.details);
  }
}

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/**
 * Narrows `unknown` to `ApiError`.
 *
 * @example
 * ```ts
 * catch (e) {
 *   if (isApiError(e)) {
 *     // e is ApiError
 *   }
 * }
 * ```
 */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
