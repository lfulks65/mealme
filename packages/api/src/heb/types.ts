/**
 * @module heb/types
 * HEB API bridge types for the MealMe platform.
 *
 * These types define the interface between the HEB SDK layer
 * and the MealMe API / UI. They include product matching results,
 * cart operations, and order tracking types.
 */

// ── Product Matching ────────────────────────────────────────────────────────

/** A single product match for a shopping list item. */
export interface ProductMatch {
  /** The shopping list item ID being matched. */
  shoppingListItemId: string;
  /** The ingredient name from the shopping list. */
  ingredientName: string;
  /** The matched HEB product. */
  product: {
    id: string;
    skuId: string;
    name: string;
    brand?: string;
    imageUrl?: string;
    price?: {
      amount: number;
      formatted: string;
    };
    unit?: string;
    inStock?: boolean;
  };
  /** Confidence score from 0 to 1 (1 = exact match). */
  confidence: number;
}

/** Result of matching all items in a shopping list to HEB products. */
export interface MatchItemsResult {
  /** Successful matches (confidence >= threshold). */
  matches: ProductMatch[];
  /** Items that could not be matched. */
  unmatched: {
    shoppingListItemId: string;
    ingredientName: string;
    reason: string;
  }[];
  /** Total items in the shopping list. */
  totalItems: number;
  /** Number of matched items. */
  matchedCount: number;
}

// ── Cart Operations ─────────────────────────────────────────────────────────

/** Result of adding matched items to an HEB cart. */
export interface AddToCartResult {
  /** Cart ID (session-scoped). */
  cartId: string;
  /** Items successfully added. */
  addedItems: {
    productId: string;
    name: string;
    quantity: number;
  }[];
  /** Items that failed to be added. */
  failedItems: {
    productId: string;
    name?: string;
    reason: string;
  }[];
  /** Updated cart totals. */
  subtotal?: {
    amount: number;
    formatted: string;
  };
  total?: {
    amount: number;
    formatted: string;
  };
}

// ── Store Selection ─────────────────────────────────────────────────────────

/** Store info for the store selector UI. */
export interface StoreInfo {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  distanceMiles?: number;
}

// ── Order Tracking ──────────────────────────────────────────────────────────

/** Order status info for the tracking UI. */
export interface OrderStatusInfo {
  orderId: string;
  status: OrderStatusValue;
  fulfillmentType?: string;
  placedAt?: string;
  timeslot?: {
    startDateTime?: string;
    endDateTime?: string;
    formattedStartTime?: string;
    formattedEndTime?: string;
    formattedDate?: string;
  };
  store?: {
    id?: string;
    name?: string;
    address?: string;
  };
  itemCount?: number;
  total?: {
    amount: number;
    formatted: string;
  };
}

/** Known HEB order status values. */
export type OrderStatusValue =
  | 'RESERVED'
  | 'RESERVATION_FAILED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SHOPPING'
  | 'CHECKED_OUT'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'PICKED_UP'
  | 'CANCELLED'
  | 'UNKNOWN';

// ── HEB Service Config ─────────────────────────────────────────────────────

/** Configuration for the HEB service. */
export interface HEBServiceConfig {
  /** HEB store ID. */
  storeId: string;
  /** ZIP code for store context. */
  zipCode: string;
  /** Minimum confidence score for auto-matching (0–1, default 0.6). */
  matchThreshold?: number;
  /** Maximum products to search per ingredient (default 5). */
  searchLimit?: number;
}
