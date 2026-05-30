/**
 * @module heb/hebService
 * Server-side HEB service that bridges the @mealme/heb SDK to the
 * MealMe app via Supabase auth context.
 *
 * Authorization: Only family members can access HEB features for
 * their org's store. Every public method verifies the caller is a
 * member of the org that owns the family.
 *
 * Key operations:
 *   - searchStores(zipCode) → find HEB stores near a location
 *   - matchItemsToProducts(shoppingListId) → fuzzy-match ingredients to HEB products
 *   - addMatchedItemsToCart(cartId, shoppingListId) → bulk add matched items to HEB cart
 *   - submitOrder(cartId, deliveryDetails) → submit the cart as an order
 *   - getOrderStatus(orderId) → track an existing order
 */

import { supabase } from '../supabase';
import { HEBClient } from '@mealme/heb';
import type {
  HEBConfig,
  Product,
  Cart,
  FulfillmentSlot,
  DeliveryDetails,
  DeliveryAddress,
  Order,
} from '@mealme/heb';
import type {
  HEBServiceConfig,
  StoreInfo,
  ProductMatch,
  MatchItemsResult,
  AddToCartResult,
  OrderStatusInfo,
  OrderStatusValue,
} from './types';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Get the currently authenticated user's ID, or throw. */
async function requireUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Not authenticated');
  }
  return user.id;
}

/**
 * Verify that the current user is a member of the org that owns
 * the given family. Throws if not.
 */
async function requireOrgMember(familyId: string): Promise<string> {
  const userId = await requireUserId();

  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('org_id')
    .eq('id', familyId)
    .single();

  if (familyError || !family) {
    throw new Error('Family not found');
  }

  const orgId = family.org_id as string;

  const { data: membership, error: memberError } = await supabase
    .from('org_memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .single();

  if (memberError || !membership) {
    throw new Error('You are not a member of this organization');
  }

  return orgId;
}

/**
 * Get the HEB store ID configured for an org.
 * Falls back to env var HEB_STORE_ID if no org-specific store is set.
 */
async function getOrgStoreId(orgId: string): Promise<string> {
  // Check for org-specific HEB store configuration
  const { data } = await supabase
    .from('organizations')
    .select('heb_store_id')
    .eq('id', orgId)
    .single();

  if (data?.heb_store_id) {
    return data.heb_store_id as string;
  }

  // Fallback to env var
  const envStoreId = process.env.HEB_STORE_ID;
  if (!envStoreId) {
    throw new Error(
      'No HEB store configured for this organization. ' +
        'Set HEB_STORE_ID in your environment or configure a store for the org.',
    );
  }
  return envStoreId;
}

/**
 * Create an initialised HEBClient for the given store.
 * Uses cookie-based auth from env vars by default.
 */
async function createHEBClient(storeId: string, zipCode?: string): Promise<HEBClient> {
  const config: HEBConfig = {
    storeId,
    zipCode: zipCode ?? process.env.HEB_ZIP_CODE ?? '',
  };

  const client = new HEBClient(config);

  // Initialise session — prefer cookies from env, then tokens
  const cookies = process.env.HEB_COOKIES;
  const authToken = process.env.HEB_AUTH_TOKEN;

  if (cookies) {
    await client.initWithCookies(cookies);
  } else if (authToken) {
    // Parse token format: "accessToken:refreshToken"
    const [accessToken, refreshToken] = authToken.split(':');
    await client.initWithTokens({
      accessToken,
      refreshToken: refreshToken ?? '',
    });
  } else {
    // Try fromEnv which reads HEB_STORE_ID / HEB_ZIP_CODE
    const envClient = HEBClient.fromEnv();
    // Copy session from env client
    if (envClient.isReady) {
      return envClient;
    }
    throw new Error(
      'HEB client not initialised. Set HEB_COOKIES or HEB_AUTH_TOKEN in your environment.',
    );
  }

  return client;
}

// ── Fuzzy Matching ──────────────────────────────────────────────────────────

/**
 * Map an SDK FulfillmentSlot (where `date` is a Date object) to
 * our MealMe FulfillmentSlot (where `date` is a string).
 */
function mapSlotFromSDK(slot: { slotId: string; date: Date; startTime: string; endTime: string; formattedStartTime: string; formattedEndTime: string; formattedDate: string; localDate: string; fee: number; isAvailable: boolean; raw?: unknown }): FulfillmentSlot {
  return {
    slotId: slot.slotId,
    date: slot.date instanceof Date ? slot.date.toISOString().split('T')[0] : String(slot.date),
    startTime: slot.startTime,
    endTime: slot.endTime,
    formattedStartTime: slot.formattedStartTime,
    formattedEndTime: slot.formattedEndTime,
    formattedDate: slot.formattedDate,
    fee: slot.fee,
    isAvailable: slot.isAvailable,
  };
}

/**
 * Compute a simple fuzzy confidence score between an ingredient name
 * and a product name. Uses token overlap and prefix matching.
 *
 * Returns a value between 0 and 1.
 */
function computeMatchConfidence(ingredient: string, productName: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(Boolean);

  const ingredientTokens = normalize(ingredient);
  const productTokens = normalize(productName);

  if (ingredientTokens.length === 0 || productTokens.length === 0) return 0;

  // Check for exact token overlap
  let overlapCount = 0;
  for (const token of ingredientTokens) {
    if (productTokens.includes(token)) {
      overlapCount++;
    }
  }

  // Check for prefix matches (e.g. "chicken" matches "Chicken Breast")
  let prefixMatches = 0;
  for (const iToken of ingredientTokens) {
    for (const pToken of productTokens) {
      if (pToken.startsWith(iToken) || iToken.startsWith(pToken)) {
        prefixMatches++;
        break;
      }
    }
  }

  // Weighted score: exact overlap + partial prefix matches
  const exactScore = overlapCount / ingredientTokens.length;
  const prefixScore = prefixMatches / ingredientTokens.length;

  // Prefer exact matches, but give partial credit for prefixes
  const score = Math.max(exactScore, prefixScore * 0.85);

  // Bonus if the first token matches (most important word)
  if (ingredientTokens[0] === productTokens[0]) {
    return Math.min(1, score + 0.15);
  }
  if (productTokens[0].startsWith(ingredientTokens[0]) || ingredientTokens[0].startsWith(productTokens[0])) {
    return Math.min(1, score + 0.1);
  }

  return score;
}

/**
 * Select the best product match from search results for an ingredient.
 */
function selectBestMatch(
  ingredientName: string,
  products: Product[],
): { product: Product; confidence: number } | null {
  if (products.length === 0) return null;

  let bestProduct: Product | null = null;
  let bestConfidence = 0;

  for (const product of products) {
    const confidence = computeMatchConfidence(ingredientName, product.name);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestProduct = product;
    }
  }

  return bestProduct ? { product: bestProduct, confidence: bestConfidence } : null;
}

// ── Shopping List Item Row ──────────────────────────────────────────────────

/** Row shape from the shopping_list_items table. */
interface ShoppingListItemRow {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  status: string;
  heb_product_id: string | null;
  shopping_list_id: string;
  category: string | null;
  recipe_ids: string[] | null;
  is_manual: boolean;
  note: string | null;
}

/**
 * Fetch shopping list items from Supabase.
 * The shopping_list_items table is expected to have a heb_product_id column
 * (added by migration 005).
 */
async function fetchShoppingListItems(
  shoppingListId: string,
): Promise<ShoppingListItemRow[]> {
  const { data, error } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('shopping_list_id', shoppingListId);

  if (error) {
    throw new Error(`Failed to fetch shopping list items: ${error.message}`);
  }

  return (data ?? []) as ShoppingListItemRow[];
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Search for HEB stores near a ZIP code.
 *
 * @param zipCode - ZIP code to search near
 * @param familyId - Family ID (for auth context)
 * @returns Array of store info objects
 */
export async function searchStores(
  zipCode: string,
  familyId: string,
): Promise<StoreInfo[]> {
  const orgId = await requireOrgMember(familyId);
  const storeId = await getOrgStoreId(orgId);

  const client = await createHEBClient(storeId, zipCode);
  const stores = await client.searchStores(zipCode);

  return stores.map((store) => ({
    id: store.id,
    name: store.name,
    address: store.address,
    distanceMiles: store.distanceMiles,
  }));
}

/**
 * Fuzzy-match shopping list items to HEB products.
 *
 * For each item in the shopping list, searches the HEB catalog
 * using the ingredient name and returns the best match with a
 * confidence score. Items already linked to a product (via
 * heb_product_id) are returned with confidence 1.0.
 *
 * @param shoppingListId - The shopping list to match
 * @param familyId - Family ID (for auth context)
 * @param config - Optional matching configuration
 * @returns Match result with matched and unmatched items
 */
export async function matchItemsToProducts(
  shoppingListId: string,
  familyId: string,
  config?: Partial<HEBServiceConfig>,
): Promise<MatchItemsResult> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));
  const threshold = config?.matchThreshold ?? 0.6;
  const searchLimit = config?.searchLimit ?? 5;

  const client = await createHEBClient(storeId, config?.zipCode);

  // Fetch shopping list items
  const items = await fetchShoppingListItems(shoppingListId);

  const matches: ProductMatch[] = [];
  const unmatched: MatchItemsResult['unmatched'] = [];

  for (const item of items) {
    try {
      // If already linked to a product, use it directly
      if (item.heb_product_id) {
        const product = await client.getProduct(item.heb_product_id);
        matches.push({
          shoppingListItemId: item.id,
          ingredientName: item.name,
          product: {
            id: product.id,
            skuId: product.skuId,
            name: product.name,
            brand: product.brand,
            imageUrl: product.imageUrl,
            price: product.price,
            unit: product.unit,
            inStock: product.inStock,
          },
          confidence: 1.0,
        });
        continue;
      }

      // Search HEB catalog for the ingredient name
      const searchResult = await client.searchProducts(item.name, {
        limit: searchLimit,
        storeId,
      });

      // Select best match
      const bestMatch = selectBestMatch(item.name, searchResult.products);

      if (bestMatch && bestMatch.confidence >= threshold) {
        matches.push({
          shoppingListItemId: item.id,
          ingredientName: item.name,
          product: {
            id: bestMatch.product.id,
            skuId: bestMatch.product.skuId,
            name: bestMatch.product.name,
            brand: bestMatch.product.brand,
            imageUrl: bestMatch.product.imageUrl,
            price: bestMatch.product.price,
            unit: bestMatch.product.unit,
            inStock: bestMatch.product.inStock,
          },
          confidence: bestMatch.confidence,
        });
      } else {
        unmatched.push({
          shoppingListItemId: item.id,
          ingredientName: item.name,
          reason: bestMatch
            ? `Best match confidence (${(bestMatch.confidence * 100).toFixed(0)}%) below threshold (${(threshold * 100).toFixed(0)}%)`
            : 'No products found',
        });
      }
    } catch (err) {
      unmatched.push({
        shoppingListItemId: item.id,
        ingredientName: item.name,
        reason: err instanceof Error ? err.message : 'Search failed',
      });
    }
  }

  return {
    matches,
    unmatched,
    totalItems: items.length,
    matchedCount: matches.length,
  };
}

/**
 * Add matched items from a shopping list to an HEB cart in bulk.
 *
 * Uses the match results from `matchItemsToProducts` to add items
 * to the HEB cart. Items that fail to be added are reported in
 * the `failedItems` array.
 *
 * @param cartId - Cart ID (session-scoped, may be unused)
 * @param shoppingListId - The shopping list whose matched items to add
 * @param familyId - Family ID (for auth context)
 * @param matches - Product matches (from matchItemsToProducts)
 * @param config - Optional service configuration
 * @returns Result with added/failed items and cart totals
 */
export async function addMatchedItemsToCart(
  _cartId: string,
  shoppingListId: string,
  familyId: string,
  matches: ProductMatch[],
  config?: Partial<HEBServiceConfig>,
): Promise<AddToCartResult> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);

  // Ensure cart exists
  const cart = await client.cart.createCart(storeId);

  const addedItems: AddToCartResult['addedItems'] = [];
  const failedItems: AddToCartResult['failedItems'] = [];

  // Fetch items to get quantities
  const items = await fetchShoppingListItems(shoppingListId);
  const itemMap = new Map(items.map((i) => [i.id, i]));

  for (const match of matches) {
    const listItem = itemMap.get(match.shoppingListItemId);
    const quantity = listItem?.quantity ?? 1;

    try {
      await client.cart.addToCart(cart.id, match.product.id, quantity);

      // Update the shopping list item with the HEB product ID
      await supabase
        .from('shopping_list_items')
        .update({ heb_product_id: match.product.id })
        .eq('id', match.shoppingListItemId);

      addedItems.push({
        productId: match.product.id,
        name: match.product.name,
        quantity,
      });
    } catch (err) {
      failedItems.push({
        productId: match.product.id,
        name: match.product.name,
        reason: err instanceof Error ? err.message : 'Failed to add to cart',
      });
    }
  }

  // Get updated cart totals
  let updatedCart: Cart | null = null;
  try {
    updatedCart = await client.cart.getCart(cart.id);
  } catch {
    // Best effort — totals may not be available
  }

  return {
    cartId: cart.id,
    addedItems,
    failedItems,
    subtotal: updatedCart?.subtotal,
    total: updatedCart?.total,
  };
}

/**
 * Get available fulfillment slots for the configured store.
 *
 * @param familyId - Family ID (for auth context)
 * @param fulfillmentType - Delivery or pickup
 * @param deliveryAddress - Delivery address (required for delivery)
 * @param config - Optional service configuration
 * @returns Array of available fulfillment slots
 */
export async function getFulfillmentSlots(
  familyId: string,
  fulfillmentType: 'DELIVERY' | 'PICKUP',
  deliveryAddress?: DeliveryAddress,
  config?: Partial<HEBServiceConfig>,
): Promise<FulfillmentSlot[]> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);
  const sdk = client._getSDKClient();

  if (fulfillmentType === 'DELIVERY') {
    if (!deliveryAddress) {
      throw new Error('Delivery address is required for delivery fulfillment slots');
    }
    const slots = await sdk.getDeliverySlots({
      address: {
        address1: deliveryAddress.address1,
        address2: deliveryAddress.address2,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        postalCode: deliveryAddress.postalCode,
        nickname: deliveryAddress.nickname,
      },
    });
    // Map SDK FulfillmentSlot (date: Date) → MealMe FulfillmentSlot (date: string)
    return slots.map(mapSlotFromSDK);
  } else {
    const slots = await sdk.getCurbsideSlots({
      storeNumber: parseInt(storeId, 10),
    });
    return slots.map(mapSlotFromSDK);
  }
}

/**
 * Submit the current cart as an HEB order.
 *
 * @param cartId - Cart ID (session-scoped)
 * @param familyId - Family ID (for auth context)
 * @param deliveryDetails - Delivery / fulfillment details
 * @param config - Optional service configuration
 * @returns Submitted order info
 */
export async function submitOrder(
  cartId: string,
  familyId: string,
  deliveryDetails: DeliveryDetails,
  config?: Partial<HEBServiceConfig>,
): Promise<Order> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);
  return client.order.submitOrder(cartId, deliveryDetails);
}

/**
 * Get the current status of an HEB order.
 *
 * @param orderId - HEB order ID
 * @param familyId - Family ID (for auth context)
 * @param config - Optional service configuration
 * @returns Order status info
 */
export async function getOrderStatus(
  orderId: string,
  familyId: string,
  config?: Partial<HEBServiceConfig>,
): Promise<OrderStatusInfo> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);
  const order = await client.order.getOrderStatus(orderId);

  return mapOrderToStatusInfo(order);
}

/**
 * List order history for the current session.
 *
 * @param familyId - Family ID (for auth context)
 * @param page - Page number (1-based)
 * @param size - Page size
 * @param config - Optional service configuration
 * @returns List of order status infos
 */
export async function listOrders(
  familyId: string,
  page?: number,
  size?: number,
  config?: Partial<HEBServiceConfig>,
): Promise<{ orders: OrderStatusInfo[]; hasMore: boolean }> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);
  const result = await client.order.listOrders({ page, size });

  return {
    orders: result.orders.map(mapOrderToStatusInfo),
    hasMore: result.hasMore,
  };
}

/**
 * Get the current HEB cart.
 *
 * @param cartId - Cart ID (session-scoped)
 * @param familyId - Family ID (for auth context)
 * @param config - Optional service configuration
 * @returns Current cart with items and totals
 */
export async function getCart(
  _cartId: string,
  familyId: string,
  config?: Partial<HEBServiceConfig>,
): Promise<Cart> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);
  return client.cart.getCart(_cartId);
}

/**
 * Remove an item from the HEB cart.
 *
 * @param cartId - Cart ID (session-scoped)
 * @param productId - Product ID to remove
 * @param familyId - Family ID (for auth context)
 * @param config - Optional service configuration
 * @returns Updated cart
 */
export async function removeCartItem(
  _cartId: string,
  productId: string,
  familyId: string,
  config?: Partial<HEBServiceConfig>,
): Promise<Cart> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);
  return client.cart.removeFromCart(_cartId, productId);
}

/**
 * Search HEB products (for manual product matching / swapping).
 *
 * @param query - Search term
 * @param familyId - Family ID (for auth context)
 * @param config - Optional service configuration
 * @returns Search results
 */
export async function searchProducts(
  query: string,
  familyId: string,
  config?: Partial<HEBServiceConfig>,
): Promise<Product[]> {
  const orgId = await requireOrgMember(familyId);
  const storeId = config?.storeId ?? (await getOrgStoreId(orgId));

  const client = await createHEBClient(storeId, config?.zipCode);
  const result = await client.searchProducts(query, {
    limit: config?.searchLimit ?? 10,
    storeId,
  });

  return result.products;
}

// ── Internal ────────────────────────────────────────────────────────────────

/** Map an HEB Order to an OrderStatusInfo for the UI. */
function mapOrderToStatusInfo(order: Order): OrderStatusInfo {
  return {
    orderId: order.orderId,
    status: (order.status ?? 'UNKNOWN') as OrderStatusValue,
    fulfillmentType: order.fulfillmentType,
    placedAt: order.placedAt,
    timeslot: order.timeslot,
    store: order.store,
    itemCount: order.items.length,
    total: order.total,
  };
}
