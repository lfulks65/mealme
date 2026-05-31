/**
 * @mealme/heb
 *
 * HEB SDK integration layer for the MealMe platform.
 * Provides a typed API surface over heb-sdk-unofficial for
 * product search, cart management, and order placement.
 */

// ── Client ──────────────────────────────────────────────────────────────────
export { HEBClient } from './client.js';

// ── Sub-managers ────────────────────────────────────────────────────────────
export { CartManager } from './cart.js';
export { OrderManager } from './order.js';

// ── Errors ──────────────────────────────────────────────────────────────────
export {
  HEBError,
  HEBAuthenticationError,
  HEBRateLimitError,
  HEBStoreError,
  HEBCartError,
  HEBOrderError,
  HEBNetworkError,
  retryWithBackoff,
  classifyHEBError,
} from './errors.js';

export type { RetryOptions } from './errors.js';

// ── Rate Limiter ────────────────────────────────────────────────────────────
export { TokenBucketRateLimiter, createHEBRateLimiter } from './rate-limit.js';

export type { RateLimiterOptions } from './rate-limit.js';

// ── Mock layer ───────────────────────────────────────────────────────────────
export { MockHEBClient } from './mock/client.js';
export { MockCartManager } from './mock/cart.js';
export { MockOrderManager } from './mock/order.js';
export { createMockHEBClient } from './mock/index.js';
export {
  MOCK_PRODUCTS,
  MOCK_STORES,
  MOCK_FULFILLMENT_SLOTS,
} from './mock/fixtures.js';
export { shouldUseMock, createHEBClientOrMock } from './mock/detect.js';

// ── Schemas ─────────────────────────────────────────────────────────────────
export {
  // Enums
  HEBShoppingContextSchema,
  HEBFulfillmentTypeSchema,

  // Configuration
  HEBConfigSchema,

  // Product
  ProductPriceSchema,
  ProductSchema,
  ProductSearchFiltersSchema,
  ProductSearchResultSchema,

  // Store
  StoreAddressSchema,
  StoreSchema,
  StoreInventorySchema,

  // Cart
  CartItemSchema,
  CartFeeSchema,
  CartSchema,

  // Delivery
  DeliveryAddressSchema,
  DeliveryDetailsSchema,
  FulfillmentSlotSchema,

  // Order
  OrderItemSchema,
  OrderTimeslotSchema,
  OrderStoreSchema,
  OrderSchema,
  OrderListResultSchema,
  ListOrdersOptionsSchema,
} from './schemas.js';

export type {
  HEBShoppingContextFromSchema,
  HEBFulfillmentTypeFromSchema,
  HEBConfigFromSchema,
  ProductPriceFromSchema,
  ProductFromSchema,
  ProductSearchFiltersFromSchema,
  ProductSearchResultFromSchema,
  StoreAddressFromSchema,
  StoreFromSchema,
  StoreInventoryFromSchema,
  CartItemFromSchema,
  CartFeeFromSchema,
  CartFromSchema,
  DeliveryAddressFromSchema,
  DeliveryDetailsFromSchema,
  FulfillmentSlotFromSchema,
  OrderItemFromSchema,
  OrderTimeslotFromSchema,
  OrderStoreFromSchema,
  OrderFromSchema,
  OrderListResultFromSchema,
  ListOrdersOptionsFromSchema,
} from './schemas.js';

// ── Types ───────────────────────────────────────────────────────────────────
export type {
  // Configuration
  HEBConfig,
  HEBShoppingContext,
  HEBFulfillmentType,

  // Product
  Product,
  ProductPrice,
  ProductSearchFilters,
  ProductSearchResult,

  // Store
  Store,
  StoreAddress,
  StoreInventory,

  // Cart
  Cart,
  CartItem,
  CartFee,

  // Delivery
  DeliveryDetails,
  DeliveryAddress,
  FulfillmentSlot,

  // Order
  Order,
  OrderItem,
  OrderTimeslot,
  OrderStore,
  OrderListResult,
  ListOrdersOptions,
} from './types.js';
