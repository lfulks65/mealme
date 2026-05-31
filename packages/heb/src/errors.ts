/**
 * @mealme/heb — Error classes, retry utility, and error classifier
 *
 * Provides a typed error hierarchy for the HEB SDK integration layer,
 * an exponential-backoff retry helper with jitter, and a classifier
 * that wraps raw SDK errors into the appropriate HEBError subclass.
 */

// ── Error classes ───────────────────────────────────────────────────────────

/**
 * Base error class for all HEB SDK errors.
 *
 * Every subclass carries a static `code` string that identifies the
 * error category (e.g. `AUTH_ERROR`, `RATE_LIMITED`).
 */
export class HEBError extends Error {
  /** Machine-readable error category code. */
  readonly code: string;
  /** The underlying error that caused this, if any. */
  readonly cause?: Error;

  constructor(code: string, message: string, cause?: Error) {
    super(message);
    this.name = 'HEBError';
    this.code = code;
    if (cause !== undefined) {
      this.cause = cause;
    }
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Invalid or expired HEB session / authentication credentials.
 *
 * Typically raised when the SDK returns HTTP 401 or 403.
 */
export class HEBAuthenticationError extends HEBError {
  constructor(message: string, cause?: Error) {
    super('AUTH_ERROR', message, cause);
    this.name = 'HEBAuthenticationError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Rate-limited by the HEB API.
 *
 * When the API returns HTTP 429, `retryAfter` may contain the
 * number of seconds the server asked us to wait.
 */
export class HEBRateLimitError extends HEBError {
  /** Seconds until the rate-limit window resets (from Retry-After header). */
  readonly retryAfter?: number;

  constructor(message: string, opts?: { retryAfter?: number; cause?: Error }) {
    super('RATE_LIMITED', message, opts?.cause);
    this.name = 'HEBRateLimitError';
    if (opts?.retryAfter !== undefined) {
      this.retryAfter = opts.retryAfter;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Store not found or unavailable.
 *
 * Raised when a requested store ID does not exist or is not
 * currently available for the selected fulfillment type.
 */
export class HEBStoreError extends HEBError {
  constructor(message: string, cause?: Error) {
    super('STORE_ERROR', message, cause);
    this.name = 'HEBStoreError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Cart operation failure.
 *
 * Covers item-not-found, max-quantity-exceeded, and other
 * cart-specific error conditions.
 */
export class HEBCartError extends HEBError {
  constructor(message: string, cause?: Error) {
    super('CART_ERROR', message, cause);
    this.name = 'HEBCartError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Order placement or status failure.
 *
 * Raised when order creation, modification, or status queries fail.
 */
export class HEBOrderError extends HEBError {
  constructor(message: string, cause?: Error) {
    super('ORDER_ERROR', message, cause);
    this.name = 'HEBOrderError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Network timeout or connection failure.
 *
 * Covers DNS failures, socket timeouts, and other transport-level
 * errors that are likely transient.
 */
export class HEBNetworkError extends HEBError {
  constructor(message: string, cause?: Error) {
    super('NETWORK_ERROR', message, cause);
    this.name = 'HEBNetworkError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ── Retry utility ───────────────────────────────────────────────────────────

/** Options for {@link retryWithBackoff}. */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3). */
  maxRetries?: number;
  /** Base delay in milliseconds for the first retry (default: 1000). */
  baseDelay?: number;
  /** Maximum delay cap in milliseconds (default: 30000). */
  maxDelay?: number;
  /**
   * Predicate that decides whether a thrown error is retryable.
   * Defaults to retrying on `HEBNetworkError` and `HEBRateLimitError`.
   */
  shouldRetry?: (error: unknown) => boolean;
}

/** Default retry predicate: retry on network and rate-limit errors. */
function defaultShouldRetry(error: unknown): boolean {
  return error instanceof HEBNetworkError || error instanceof HEBRateLimitError;
}

/**
 * Execute an async function with exponential-backoff retry and jitter.
 *
 * - On `HEBRateLimitError` that carries a `retryAfter` value, that
 *   value (in seconds) is used as the delay instead of the computed
 *   backoff.
 * - Jitter is applied as a random fraction (0–1) of the computed delay
 *   to avoid thundering-herd effects.
 * - After exhausting all retries the last error is re-thrown.
 *
 * @example
 * ```ts
 * const product = await retryWithBackoff(() => client.getProduct(id));
 * ```
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelay = options?.baseDelay ?? 1000;
  const maxDelay = options?.maxDelay ?? 30_000;
  const shouldRetry = options?.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // If this was the last attempt or the error is not retryable, stop.
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Determine delay: prefer retryAfter from rate-limit errors.
      let delay: number;
      if (error instanceof HEBRateLimitError && error.retryAfter !== undefined) {
        delay = error.retryAfter * 1000;
      } else {
        // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay.
        delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      }

      // Add jitter: random value in [0, delay)
      delay = Math.floor(Math.random() * delay);

      // Ensure a minimum of 100ms so we don't retry instantly.
      delay = Math.max(delay, 100);

      await sleep(delay);
    }
  }

  // Should be unreachable, but TypeScript needs it.
  throw lastError;
}

/** Simple promise-based sleep helper. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Error classifier ────────────────────────────────────────────────────────

/**
 * Inspect a raw (possibly non-typed) error and wrap it into the
 * appropriate {@link HEBError} subclass.
 *
 * Handles common patterns:
 * - HTTP 401 / 403 → {@link HEBAuthenticationError}
 * - HTTP 429       → {@link HEBRateLimitError} (extracts Retry-After)
 * - Network / fetch errors → {@link HEBNetworkError}
 * - Already-typed `HEBError` instances → returned as-is
 * - Everything else → generic {@link HEBError}
 */
export function classifyHEBError(error: unknown): HEBError {
  // Already a typed HEB error — return as-is.
  if (error instanceof HEBError) {
    return error;
  }

  // ── Inspect error-like objects ────────────────────────────────────────

  const err = error as Record<string, unknown> | undefined;

  // Check for HTTP status codes on error objects.
  const status = typeof err?.['status'] === 'number'
    ? (err['status'] as number)
    : typeof err?.['statusCode'] === 'number'
      ? (err['statusCode'] as number)
      : undefined;

  if (status === 401 || status === 403) {
    return new HEBAuthenticationError(
      (err?.['message'] as string) ?? `Authentication failed (HTTP ${status})`,
      error instanceof Error ? error : undefined,
    );
  }

  if (status === 429) {
    // Try to extract Retry-After header value.
    let retryAfter: number | undefined;
    const headers = err?.['headers'] as Record<string, unknown> | undefined;
    if (headers) {
      const raw = headers['retry-after'] ?? headers['Retry-After'];
      if (typeof raw === 'string') {
        const parsed = Number(raw);
        if (!Number.isNaN(parsed) && parsed > 0) {
          retryAfter = parsed;
        }
      } else if (typeof raw === 'number' && raw > 0) {
        retryAfter = raw;
      }
    }

    return new HEBRateLimitError(
      (err?.['message'] as string) ?? 'Rate limited by HEB API (HTTP 429)',
      { retryAfter, cause: error instanceof Error ? error : undefined },
    );
  }

  // Network / connection errors (fetch-level, Node.js system errors).
  if (isNetworkError(error)) {
    return new HEBNetworkError(
      (error as Error).message ?? 'Network error communicating with HEB API',
      error instanceof Error ? error : undefined,
    );
  }

  // Generic fallback — wrap in base HEBError.
  if (error instanceof Error) {
    return new HEBError('UNKNOWN_ERROR', error.message, error);
  }

  const message = typeof error === 'string' ? error : 'Unknown HEB SDK error';
  return new HEBError('UNKNOWN_ERROR', message);
}

/**
 * Heuristic to detect network-level errors from fetch, Node.js, or
 * common HTTP libraries.
 */
function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const name = error.name ?? '';
  const message = error.message ?? '';
  const code = (error as NodeJS.ErrnoException).code ?? '';

  // Node.js system error codes for network failures.
  const networkCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ENETUNREACH',
    'EAI_AGAIN',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
  ];

  if (networkCodes.includes(code)) return true;

  // Fetch API network errors.
  if (error instanceof TypeError && message.includes('fetch')) return true;

  // Common error name patterns.
  const networkNames = ['NetworkError', 'FetchError', 'AbortError'];
  if (networkNames.includes(name)) return true;

  // Heuristic on message content.
  const networkKeywords = [
    'network',
    'timeout',
    'connection refused',
    'socket hang up',
    'ECONNRESET',
    'ETIMEDOUT',
  ];
  const lowerMessage = message.toLowerCase();
  if (networkKeywords.some((kw) => lowerMessage.includes(kw.toLowerCase()))) {
    return true;
  }

  return false;
}
