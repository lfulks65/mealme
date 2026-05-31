/**
 * @mealme/heb — Mock layer barrel exports and factory
 *
 * Re-exports all mock classes, fixture data, and provides
 * a factory function for creating configured MockHEBClient instances.
 */

export { MockHEBClient } from './client.js';
export { MockCartManager } from './cart.js';
export { MockOrderManager } from './order.js';
export {
  MOCK_PRODUCTS,
  MOCK_STORES,
  MOCK_FULFILLMENT_SLOTS,
} from './fixtures.js';

import { MockHEBClient } from './client.js';
import type { HEBConfig } from '../types.js';

/**
 * Create a configured MockHEBClient.
 *
 * @param config - Optional partial HEBConfig to apply
 * @returns A new MockHEBClient instance
 */
export function createMockHEBClient(config?: Partial<HEBConfig>): MockHEBClient {
  return new MockHEBClient(config);
}
