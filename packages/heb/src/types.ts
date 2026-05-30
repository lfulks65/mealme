/**
 * @mealme/heb — HEB-specific types
 *
 * These types define the MealMe integration surface over the
 * heb-sdk-unofficial package.  They are intentionally decoupled
 * from the raw SDK types so that consumers of @mealme/heb never
 * need to import the SDK directly.
 */

// ── Configuration ──────────────────────────────────────────────────────────

/** Configuration for initialising the HEB integration client. */
export interface HEBConfig {
  /** HEB store ID to use as the default fulfillment store. */
  storeId: string;
  /** ZIP code for store search / delivery context. */
  zipCode: string;
  /** Shopping context (defaults to CURBSIDE_PICKUP). */
  shoppingContext?: HEBShoppingContext;
  /** Optional timeout for API requests in ms (default 30 000). */
  timeout?: number;
  /** Enable debug logging (default false). */
  debug?: boolean;
}

/** Shopping context values recognised by the HEB API. */
export type HEBShoppingContext =
  | 'CURBSIDE_PICKUP'
  | 'CURBSIDE_DELIVERY'
  | 'EXPLORE_MY_STORE';

/** Fulfillment type for timeslot reservations. */
export type HEBFulfillmentType = 'DELIVERY' | 'PICKUP';

// ── Product ─────────────────────────────────────────────────────────────────

/** A product from the HEB catalog. */
export interface Product {
  id: string;
  skuId: string;
  name: string;
  brand?: string;
  description?: string;
  imageUrl?: string;
  price?: ProductPrice;
  unit?: string;
  category?: string;
  inStock?: boolean;
  isAvailable?: boolean;
  maxQuantity?: number;
  productUrl?: string;
}

/** Price information for a product. */
export interface ProductPrice {
  /** Numeric amount (in dollars, not cents). */
  amount: number;
  /** Pre-formatted display string, e.g. "$3.99". */
  formatted: string;
}

/** Filters that can be applied when searching the HEB catalog. */
export interface ProductSearchFilters {
  /** Maximum number of results (default 20). */
  limit?: number;
  /** Store ID override (uses default store if omitted). */
  storeId?: string;
  /** Shopping context override. */
  shoppingContext?: HEBShoppingContext;
  /** Whether to include images in results. */
  includeImages?: boolean;
}

/** Paginated search result from the HEB catalog. */
export interface ProductSearchResult {
  products: Product[];
  totalCount: number;
  page: number;
  hasNextPage: boolean;
  nextCursor?: string;
}

// ── Store ───────────────────────────────────────────────────────────────────

/** An HEB store location. */
export interface Store {
  id: string;
  name: string;
  address: StoreAddress;
  distanceMiles?: number;
}

/** Address of an HEB store. */
export interface StoreAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

/** Inventory availability for a product at a specific store. */
export interface StoreInventory {
  productId: string;
  storeId: string;
  inStock: boolean;
  availableQuantity?: number;
  aisle?: string;
}

// ── Cart ────────────────────────────────────────────────────────────────────

/** A shopping cart tied to a specific HEB store. */
export interface Cart {
  id: string;
  storeId: string;
  items: CartItem[];
  itemCount: number;
  subtotal: ProductPrice;
  total: ProductPrice;
  tax?: ProductPrice;
  savings?: ProductPrice;
  fees: CartFee[];
}

/** A single item in a shopping cart. */
export interface CartItem {
  productId: string;
  skuId: string;
  name?: string;
  quantity: number;
  price?: ProductPrice;
  imageUrl?: string;
  brand?: string;
  inStock?: boolean;
}

/** A fee applied to the cart (delivery, curbside, etc.). */
export interface CartFee {
  id: string;
  displayName: string;
  feeType: string;
  amount: ProductPrice;
  description?: string;
}

// ── Delivery ────────────────────────────────────────────────────────────────

/** Delivery details for placing an order. */
export interface DeliveryDetails {
  /** Delivery address. */
  address: DeliveryAddress;
  /** Desired fulfillment type. */
  fulfillmentType: HEBFulfillmentType;
  /** Reserved timeslot ID (from getDeliverySlots / getCurbsideSlots). */
  slotId: string;
  /** Date for the timeslot (YYYY-MM-DD). */
  slotDate: string;
  /** Store ID for fulfillment. */
  storeId: string;
}

/** Delivery address. */
export interface DeliveryAddress {
  address1: string;
  address2?: string;
  city: string;
  state: string;
  postalCode: string;
  nickname?: string;
}

/** A fulfillment timeslot. */
export interface FulfillmentSlot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  formattedStartTime: string;
  formattedEndTime: string;
  formattedDate: string;
  fee: number;
  isAvailable: boolean;
}

// ── Order ───────────────────────────────────────────────────────────────────

/** An HEB order. */
export interface Order {
  orderId: string;
  status: string;
  fulfillmentType?: string;
  items: OrderItem[];
  subtotal?: ProductPrice;
  total?: ProductPrice;
  tax?: ProductPrice;
  placedAt?: string;
  timeslot?: OrderTimeslot;
  store?: OrderStore;
}

/** A single item in an order. */
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: string;
  unitPrice: number;
  image?: string;
}

/** Timeslot information for an order. */
export interface OrderTimeslot {
  startDateTime?: string;
  endDateTime?: string;
  formattedStartTime?: string;
  formattedEndTime?: string;
  formattedDate?: string;
}

/** Store information attached to an order. */
export interface OrderStore {
  id?: string;
  name?: string;
  address?: string;
}

/** Paginated order history result. */
export interface OrderListResult {
  orders: Order[];
  page: number;
  hasMore: boolean;
}

/** Options for listing orders. */
export interface ListOrdersOptions {
  page?: number;
  size?: number;
}
