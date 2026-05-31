/**
 * @mealme/heb — Environment detection for mock vs real client
 *
 * Provides utilities to decide whether to use the mock HEB client
 * or the real one based on environment variables.
 */

import { HEBClient } from '../client.js';
import { MockHEBClient } from './client.js';
import type { HEBConfig } from '../types.js';

/**
 * Determine whether the mock HEB client should be used.
 *
 * Returns `true` when either:
 * - `HEB_MOCK=true` is set in the environment
 * - `NODE_ENV=test` is set in the environment
 */
export function shouldUseMock(): boolean {
  return process.env.HEB_MOCK === 'true' || process.env.NODE_ENV === 'test';
}

/**
 * Create either a real HEBClient or a MockHEBClient based on
 * the current environment.
 *
 * When `shouldUseMock()` returns `true`, a MockHEBClient is
 * created with the provided config (or defaults). Otherwise,
 * a real HEBClient is created.
 *
 * @param config - HEB configuration (required for real client,
 *                 optional for mock which has sensible defaults)
 */
export function createHEBClientOrMock(config?: HEBConfig): HEBClient | MockHEBClient {
  if (shouldUseMock()) {
    return new MockHEBClient(config);
  }

  if (!config) {
    throw new Error(
      'HEBConfig is required when using the real HEBClient. ' +
        'Provide storeId and zipCode, or set HEB_MOCK=true / NODE_ENV=test for mock mode.',
    );
  }

  return new HEBClient(config);
}
