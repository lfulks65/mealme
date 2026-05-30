/**
 * @module heb
 * HEB API bridge for the MealMe platform.
 *
 * Provides server-side functions that wrap @mealme/heb SDK calls
 * with Supabase auth context. Only family members can access
 * HEB features for their org's store.
 */

// Types
export type {
  ProductMatch,
  MatchItemsResult,
  AddToCartResult,
  StoreInfo,
  OrderStatusInfo,
  OrderStatusValue,
  HEBServiceConfig,
} from './types';

// Service functions
export {
  searchStores,
  matchItemsToProducts,
  addMatchedItemsToCart,
  getFulfillmentSlots,
  submitOrder,
  getOrderStatus,
  listOrders,
  getCart,
  removeCartItem,
  searchProducts,
} from './hebService';
