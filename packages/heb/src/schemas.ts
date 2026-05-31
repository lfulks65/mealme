/**
 * @mealme/heb — Zod validation schemas
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types.ts` exactly, enabling runtime validation
 * and type-safe parsing.
 */

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

/** Shopping context values recognised by the HEB API. */
export const HEBShoppingContextSchema = z.enum([
  'CURBSIDE_PICKUP',
  'CURBSIDE_DELIVERY',
  'EXPLORE_MY_STORE',
]);

/** Fulfillment type for timeslot reservations. */
export const HEBFulfillmentTypeSchema = z.enum(['DELIVERY', 'PICKUP']);

// ── Configuration ──────────────────────────────────────────────────────────

/**
 * Configuration for initialising the HEB integration client.
 *
 * The `rateLimiter` field is a class instance and cannot be meaningfully
 * validated by Zod — it is typed as `z.any()` here.
 */
export const HEBConfigSchema = z.object({
  storeId: z.string().min(1),
  zipCode: z.string().min(1),
  shoppingContext: HEBShoppingContextSchema.optional(),
  timeout: z.number().int().positive().optional(),
  debug: z.boolean().optional(),
  rateLimiter: z.any().optional(),
});

// ── Product ─────────────────────────────────────────────────────────────────

/** Price information for a product. */
export const ProductPriceSchema = z.object({
  amount: z.number(),
  formatted: z.string().min(1),
});

/** A product from the HEB catalog. */
export const ProductSchema = z.object({
  id: z.string().min(1),
  skuId: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  price: ProductPriceSchema.optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  inStock: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  maxQuantity: z.number().int().nonnegative().optional(),
  productUrl: z.string().url().optional(),
});

/** Filters that can be applied when searching the HEB catalog. */
export const ProductSearchFiltersSchema = z.object({
  limit: z.number().int().positive().optional(),
  storeId: z.string().optional(),
  shoppingContext: HEBShoppingContextSchema.optional(),
  includeImages: z.boolean().optional(),
});

/** Paginated search result from the HEB catalog. */
export const ProductSearchResultSchema = z.object({
  products: z.array(ProductSchema),
  totalCount: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  nextCursor: z.string().optional(),
});

// ── Store ───────────────────────────────────────────────────────────────────

/** Address of an HEB store. */
export const StoreAddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
});

/** An HEB store location. */
export const StoreSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: StoreAddressSchema,
  distanceMiles: z.number().nonnegative().optional(),
});

/** Inventory availability for a product at a specific store. */
export const StoreInventorySchema = z.object({
  productId: z.string().min(1),
  storeId: z.string().min(1),
  inStock: z.boolean(),
  availableQuantity: z.number().int().nonnegative().optional(),
  aisle: z.string().optional(),
});

// ── Cart ────────────────────────────────────────────────────────────────────

/** A single item in a shopping cart. */
export const CartItemSchema = z.object({
  productId: z.string().min(1),
  skuId: z.string().min(1),
  name: z.string().optional(),
  quantity: z.number().int().positive(),
  price: ProductPriceSchema.optional(),
  imageUrl: z.string().url().optional(),
  brand: z.string().optional(),
  inStock: z.boolean().optional(),
});

/** A fee applied to the cart (delivery, curbside, etc.). */
export const CartFeeSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  feeType: z.string().min(1),
  amount: ProductPriceSchema,
  description: z.string().optional(),
});

/** A shopping cart tied to a specific HEB store. */
export const CartSchema = z.object({
  id: z.string().min(1),
  storeId: z.string().min(1),
  items: z.array(CartItemSchema),
  itemCount: z.number().int().nonnegative(),
  subtotal: ProductPriceSchema,
  total: ProductPriceSchema,
  tax: ProductPriceSchema.optional(),
  savings: ProductPriceSchema.optional(),
  fees: z.array(CartFeeSchema),
});

// ── Delivery ────────────────────────────────────────────────────────────────

/** Delivery address. */
export const DeliveryAddressSchema = z.object({
  address1: z.string().min(1),
  address2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  nickname: z.string().optional(),
});

/** Delivery details for placing an order. */
export const DeliveryDetailsSchema = z.object({
  address: DeliveryAddressSchema,
  fulfillmentType: HEBFulfillmentTypeSchema,
  slotId: z.string().min(1),
  slotDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  storeId: z.string().min(1),
});

/** A fulfillment timeslot. */
export const FulfillmentSlotSchema = z.object({
  slotId: z.string().min(1),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  formattedStartTime: z.string().min(1),
  formattedEndTime: z.string().min(1),
  formattedDate: z.string().min(1),
  fee: z.number().nonnegative(),
  isAvailable: z.boolean(),
});

// ── Order ───────────────────────────────────────────────────────────────────

/** A single item in an order. */
export const OrderItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  price: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  image: z.string().optional(),
});

/** Timeslot information for an order. */
export const OrderTimeslotSchema = z.object({
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  formattedStartTime: z.string().optional(),
  formattedEndTime: z.string().optional(),
  formattedDate: z.string().optional(),
});

/** Store information attached to an order. */
export const OrderStoreSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  address: z.string().optional(),
});

/** An HEB order. */
export const OrderSchema = z.object({
  orderId: z.string().min(1),
  status: z.string().min(1),
  fulfillmentType: z.string().optional(),
  items: z.array(OrderItemSchema),
  subtotal: ProductPriceSchema.optional(),
  total: ProductPriceSchema.optional(),
  tax: ProductPriceSchema.optional(),
  placedAt: z.string().optional(),
  timeslot: OrderTimeslotSchema.optional(),
  store: OrderStoreSchema.optional(),
});

/** Paginated order history result. */
export const OrderListResultSchema = z.object({
  orders: z.array(OrderSchema),
  page: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});

/** Options for listing orders. */
export const ListOrdersOptionsSchema = z.object({
  page: z.number().int().nonnegative().optional(),
  size: z.number().int().positive().optional(),
});

// ── Inferred types ──────────────────────────────────────────────────────────

export type HEBShoppingContextFromSchema = z.infer<typeof HEBShoppingContextSchema>;
export type HEBFulfillmentTypeFromSchema = z.infer<typeof HEBFulfillmentTypeSchema>;
export type HEBConfigFromSchema = z.infer<typeof HEBConfigSchema>;
export type ProductPriceFromSchema = z.infer<typeof ProductPriceSchema>;
export type ProductFromSchema = z.infer<typeof ProductSchema>;
export type ProductSearchFiltersFromSchema = z.infer<typeof ProductSearchFiltersSchema>;
export type ProductSearchResultFromSchema = z.infer<typeof ProductSearchResultSchema>;
export type StoreAddressFromSchema = z.infer<typeof StoreAddressSchema>;
export type StoreFromSchema = z.infer<typeof StoreSchema>;
export type StoreInventoryFromSchema = z.infer<typeof StoreInventorySchema>;
export type CartItemFromSchema = z.infer<typeof CartItemSchema>;
export type CartFeeFromSchema = z.infer<typeof CartFeeSchema>;
export type CartFromSchema = z.infer<typeof CartSchema>;
export type DeliveryAddressFromSchema = z.infer<typeof DeliveryAddressSchema>;
export type DeliveryDetailsFromSchema = z.infer<typeof DeliveryDetailsSchema>;
export type FulfillmentSlotFromSchema = z.infer<typeof FulfillmentSlotSchema>;
export type OrderItemFromSchema = z.infer<typeof OrderItemSchema>;
export type OrderTimeslotFromSchema = z.infer<typeof OrderTimeslotSchema>;
export type OrderStoreFromSchema = z.infer<typeof OrderStoreSchema>;
export type OrderFromSchema = z.infer<typeof OrderSchema>;
export type OrderListResultFromSchema = z.infer<typeof OrderListResultSchema>;
export type ListOrdersOptionsFromSchema = z.infer<typeof ListOrdersOptionsSchema>;
