/**
 * @mealme/heb — CartManager
 *
 * Manages HEB shopping carts through the SDK client.
 * Provides typed methods for cart creation, item management,
 * and retrieval with computed totals.
 */

import type { HEBClient } from './client.js';
import type {
  Cart,
  CartItem,
  CartFee,
  ProductPrice,
} from './types.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map a raw SDK cart item to the MealMe CartItem type. */
function mapCartItem(raw: {
  productId: string;
  skuId: string;
  name?: string;
  quantity: number;
  price?: { amount: number; formatted: string };
  imageUrl?: string;
  brand?: string;
  inStock?: boolean;
}): CartItem {
  return {
    productId: raw.productId,
    skuId: raw.skuId,
    name: raw.name,
    quantity: raw.quantity,
    price: raw.price
      ? { amount: raw.price.amount, formatted: raw.price.formatted }
      : undefined,
    imageUrl: raw.imageUrl,
    brand: raw.brand,
    inStock: raw.inStock,
  };
}

/** Map a raw SDK cart fee to the MealMe CartFee type. */
function mapCartFee(raw: {
  id: string;
  displayName: string;
  feeType: string;
  amount: { amount: number; formatted: string };
  description?: string;
}): CartFee {
  return {
    id: raw.id,
    displayName: raw.displayName,
    feeType: raw.feeType,
    amount: { amount: raw.amount.amount, formatted: raw.amount.formatted },
    description: raw.description,
  };
}

/** Map a raw SDK display price to the MealMe ProductPrice type. */
function mapPrice(raw: { amount: number; formatted: string } | undefined): ProductPrice {
  return raw
    ? { amount: raw.amount, formatted: raw.formatted }
    : { amount: 0, formatted: '$0.00' };
}

/** Map a raw SDK cart to the MealMe Cart type. */
function mapCart(raw: {
  id: string;
  items: ReturnType<typeof mapCartItem>[];
  itemCount: number;
  subtotal: { amount: number; formatted: string };
  total: { amount: number; formatted: string };
  tax?: { amount: number; formatted: string };
  savings?: { amount: number; formatted: string };
  fees: ReturnType<typeof mapCartFee>[];
}, storeId: string): Cart {
  return {
    id: raw.id,
    storeId,
    items: raw.items.map(mapCartItem),
    itemCount: raw.itemCount,
    subtotal: mapPrice(raw.subtotal),
    total: mapPrice(raw.total),
    tax: raw.tax ? mapPrice(raw.tax) : undefined,
    savings: raw.savings ? mapPrice(raw.savings) : undefined,
    fees: raw.fees.map(mapCartFee),
  };
}

// ── CartManager ──────────────────────────────────────────────────────────────

/**
 * Manages HEB shopping carts.
 *
 * The HEB SDK uses a single cart per session (tied to the store
 * context).  CartManager wraps the SDK cart operations and
 * normalises the responses into MealMe types.
 */
export class CartManager {
  constructor(private readonly client: HEBClient) {}

  /**
   * Create a new cart context for the given store.
   *
   * In the HEB API a cart is implicitly created per session/store.
   * This method ensures the store is set and returns the current
   * (empty) cart.
   *
   * @param storeId - Store ID for the cart (uses default if omitted)
   */
  async createCart(storeId?: string): Promise<Cart> {
    const sdk = this.client._getSDKClient();
    const sid = storeId ?? this.client._getStoreId();

    // Ensure the store context is set
    await this.client.setStore(sid);

    const raw = await sdk.getCart();
    return mapCart(raw, sid);
  }

  /**
   * Add a product to the cart.
   *
   * If the product is already in the cart, its quantity will be
   * updated to the given value (the HEB API sets, not increments).
   *
   * @param cartId    - Cart ID (currently unused — cart is session-scoped)
   * @param productId - Product ID to add
   * @param quantity  - Quantity to set (default 1)
   */
  async addToCart(_cartId: string, productId: string, quantity: number = 1): Promise<Cart> {
    const sdk = this.client._getSDKClient();

    // Fetch SKU ID for the product
    const skuId = await sdk.getSkuId(productId);

    // Add the item
    await sdk.addToCart(productId, skuId, quantity);

    // Return updated cart
    const raw = await sdk.getCart();
    return mapCart(raw, this.client._getStoreId());
  }

  /**
   * Remove a product from the cart.
   *
   * @param cartId    - Cart ID (currently unused — cart is session-scoped)
   * @param productId - Product ID to remove
   */
  async removeFromCart(_cartId: string, productId: string): Promise<Cart> {
    const sdk = this.client._getSDKClient();

    // Fetch SKU ID for the product
    const skuId = await sdk.getSkuId(productId);

    // Remove the item
    await sdk.removeFromCart(productId, skuId);

    // Return updated cart
    const raw = await sdk.getCart();
    return mapCart(raw, this.client._getStoreId());
  }

  /**
   * Get the current cart with items and totals.
   *
   * @param cartId - Cart ID (currently unused — cart is session-scoped)
   */
  async getCart(_cartId: string): Promise<Cart> {
    const sdk = this.client._getSDKClient();
    const raw = await sdk.getCart();
    return mapCart(raw, this.client._getStoreId());
  }

  /**
   * Clear all items from the cart.
   *
   * The HEB SDK does not have a bulk-clear endpoint, so this
   * removes items one by one.
   *
   * @param cartId - Cart ID (currently unused — cart is session-scoped)
   */
  async clearCart(_cartId: string): Promise<Cart> {
    const sdk = this.client._getSDKClient();

    // Get current items
    const current = await sdk.getCart();

    // Remove each item
    for (const item of current.items) {
      try {
        await sdk.removeFromCart(item.productId, item.skuId);
      } catch {
        // Best-effort removal — continue even if one fails
      }
    }

    // Return empty cart
    const raw = await sdk.getCart();
    return mapCart(raw, this.client._getStoreId());
  }
}
