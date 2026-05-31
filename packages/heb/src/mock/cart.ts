/**
 * @mealme/heb — MockCartManager
 *
 * In-memory cart implementation for development and testing.
 * Maintains cart state across operations without making real API calls.
 */

import type {
  Cart,
  CartItem,
  CartFee,
  ProductPrice,
} from '../types.js';
import { MOCK_PRODUCTS } from './fixtures.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a unique cart ID. */
let cartCounter = 0;
function nextCartId(): string {
  cartCounter += 1;
  return `mock-cart-${cartCounter}`;
}

/** Compute the subtotal from cart items. */
function computeSubtotal(items: CartItem[]): ProductPrice {
  const amount = items.reduce((sum, item) => {
    const price = item.price?.amount ?? 0;
    return sum + price * item.quantity;
  }, 0);
  return { amount: Math.round(amount * 100) / 100, formatted: `$${amount.toFixed(2)}` };
}

/** Compute the total from subtotal, tax, and fees. */
function computeTotal(subtotal: ProductPrice, tax: ProductPrice, fees: CartFee[]): ProductPrice {
  const feeAmount = fees.reduce((sum, f) => sum + f.amount.amount, 0);
  const amount = Math.round((subtotal.amount + tax.amount + feeAmount) * 100) / 100;
  return { amount, formatted: `$${amount.toFixed(2)}` };
}

/** Compute a simple 8.25% Texas sales tax. */
function computeTax(subtotal: ProductPrice): ProductPrice {
  const amount = Math.round(subtotal.amount * 0.0825 * 100) / 100;
  return { amount, formatted: `$${amount.toFixed(2)}` };
}

// ── In-memory cart store ────────────────────────────────────────────────────

interface InMemoryCart {
  id: string;
  storeId: string;
  items: CartItem[];
}

// ── MockCartManager ─────────────────────────────────────────────────────────

/**
 * In-memory cart manager for development and testing.
 *
 * All cart state is held in memory and lost when the process exits.
 * Implements the same public API as CartManager but returns
 * deterministic data.
 */
export class MockCartManager {
  private carts = new Map<string, InMemoryCart>();

  /**
   * Create a new empty cart.
   *
   * @param storeId - Store ID to associate with the cart (defaults to '790')
   */
  async createCart(storeId?: string): Promise<Cart> {
    const id = nextCartId();
    const cart: InMemoryCart = {
      id,
      storeId: storeId ?? '790',
      items: [],
    };
    this.carts.set(id, cart);
    return this.toCart(cart);
  }

  /**
   * Add a product to the cart.
   *
   * If the product is already in the cart, its quantity is updated
   * (replaced, not incremented).
   *
   * @param cartId    - Cart ID
   * @param productId - Product ID to add
   * @param quantity  - Quantity to set (default 1)
   */
  async addToCart(cartId: string, productId: string, quantity: number = 1): Promise<Cart> {
    const cart = this.getCartOrThrow(cartId);

    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const existingIdx = cart.items.findIndex((i) => i.productId === productId);
    const cartItem: CartItem = {
      productId: product.id,
      skuId: product.skuId,
      name: product.name,
      quantity,
      price: product.price,
      imageUrl: product.imageUrl,
      brand: product.brand,
      inStock: product.inStock,
    };

    if (existingIdx >= 0) {
      cart.items[existingIdx] = cartItem;
    } else {
      cart.items.push(cartItem);
    }

    return this.toCart(cart);
  }

  /**
   * Remove a product from the cart.
   *
   * @param cartId    - Cart ID
   * @param productId - Product ID to remove
   */
  async removeFromCart(cartId: string, productId: string): Promise<Cart> {
    const cart = this.getCartOrThrow(cartId);
    cart.items = cart.items.filter((i) => i.productId !== productId);
    return this.toCart(cart);
  }

  /**
   * Get the current cart.
   *
   * @param cartId - Cart ID
   */
  async getCart(cartId: string): Promise<Cart> {
    const cart = this.getCartOrThrow(cartId);
    return this.toCart(cart);
  }

  /**
   * Clear all items from the cart.
   *
   * @param cartId - Cart ID
   */
  async clearCart(cartId: string): Promise<Cart> {
    const cart = this.getCartOrThrow(cartId);
    cart.items = [];
    return this.toCart(cart);
  }

  // ── Internal helpers ───────────────────────────────────────────────────

  /** Get a cart or throw if not found. */
  private getCartOrThrow(cartId: string): InMemoryCart {
    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }
    return cart;
  }

  /** Convert an in-memory cart to the public Cart type with computed totals. */
  private toCart(cart: InMemoryCart): Cart {
    const items = [...cart.items];
    const subtotal = computeSubtotal(items);
    const tax = computeTax(subtotal);
    const fees: CartFee[] = [];

    const total = computeTotal(subtotal, tax, fees);

    return {
      id: cart.id,
      storeId: cart.storeId,
      items,
      itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal,
      total,
      tax,
      fees,
    };
  }
}
