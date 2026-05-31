/**
 * @mealme/heb — Token-bucket rate limiter
 *
 * Implements a token-bucket algorithm for controlling request rates
 * to the HEB API.  Tokens are refilled on a fixed interval and
 * consumed on each request.
 *
 * Usage:
 * ```ts
 * const limiter = new TokenBucketRateLimiter({ maxRequests: 10, intervalMs: 1000 });
 * await limiter.acquire();          // blocks until a token is available
 * limiter.tryAcquire();            // non-blocking — returns true/false
 * limiter.getTokens();             // current token count
 * limiter.dispose();               // clean up the interval timer
 * ```
 */

// ── Types ───────────────────────────────────────────────────────────────────

/** Options for constructing a TokenBucketRateLimiter. */
export interface RateLimiterOptions {
  /** Bucket capacity — maximum tokens the bucket can hold (default 10). */
  maxRequests: number;
  /** Refill interval in milliseconds (default 1000). */
  intervalMs: number;
  /** Tokens added per interval. Defaults to `maxRequests` when omitted. */
  tokensPerInterval?: number;
}

// ── TokenBucketRateLimiter ──────────────────────────────────────────────────

/**
 * Token-bucket rate limiter.
 *
 * The bucket starts full.  On every `intervalMs` milliseconds,
 * `tokensPerInterval` tokens are added (capped at `maxRequests`).
 * `acquire()` consumes one token, blocking if none are available.
 * `tryAcquire()` consumes one token only if one is immediately available.
 */
export class TokenBucketRateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillAmount: number;
  private readonly refillIntervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Queue of pending acquire() promises waiting for a token. */
  private waiters: Array<() => void> = [];

  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.maxRequests;
    this.refillAmount = options.tokensPerInterval ?? options.maxRequests;
    this.refillIntervalMs = options.intervalMs;
    this.tokens = this.maxTokens;

    // Start the refill timer
    this.timer = setInterval(() => this.refill(), this.refillIntervalMs);

    // Allow the Node.js process to exit even if the timer is still active
    if (this.timer && typeof this.timer === 'object' && 'unref' in this.timer) {
      this.timer.unref();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Wait until a token is available, then consume it.
   *
   * Resolves immediately if tokens > 0; otherwise the promise resolves
   * once the next refill makes a token available.
   */
  async acquire(): Promise<void> {
    if (this.tokens > 0) {
      this.tokens -= 1;
      return;
    }

    // No tokens available — wait for the next refill
    return new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  /**
   * Non-blocking token acquisition.
   *
   * Returns `true` and consumes a token if one is available immediately,
   * `false` otherwise.
   */
  tryAcquire(): boolean {
    if (this.tokens > 0) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Current token count (for monitoring / observability).
   */
  getTokens(): number {
    return this.tokens;
  }

  /**
   * Reset the bucket to full capacity.
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.drainWaiters();
  }

  /**
   * Clean up the interval timer.
   *
   * Call this when the limiter is no longer needed to prevent
   * resource leaks.  After `dispose()`, calling `acquire()` will
   * still work but no further refills will occur.
   */
  dispose(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Resolve any pending waiters so they don't hang forever
    this.drainWaiters();
  }

  // ── Internal ───────────────────────────────────────────────────────────

  /** Refill tokens and wake up any pending waiters. */
  private refill(): void {
    this.tokens = Math.min(this.maxTokens, this.tokens + this.refillAmount);
    this.drainWaiters();
  }

  /**
   * Resolve as many waiting acquire() calls as tokens allow.
   *
   * Each waiter consumes one token.
   */
  private drainWaiters(): void {
    while (this.waiters.length > 0 && this.tokens > 0) {
      const resolve = this.waiters.shift()!;
      this.tokens -= 1;
      resolve();
    }
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create a rate limiter pre-configured with sensible HEB API defaults.
 *
 * Conservative default: 10 requests per second, which is well within
 * the HEB API's acceptable rate limits.
 *
 * @param overrides - Optional overrides applied on top of the defaults.
 */
export function createHEBRateLimiter(
  overrides?: Partial<RateLimiterOptions>,
): TokenBucketRateLimiter {
  return new TokenBucketRateLimiter({
    maxRequests: overrides?.maxRequests ?? 10,
    intervalMs: overrides?.intervalMs ?? 1000,
    tokensPerInterval: overrides?.tokensPerInterval,
  });
}
