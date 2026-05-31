/**
 * @mealme/heb — MockHEBClient
 *
 * Mock implementation of HEBClient that returns deterministic fixture
 * data for development and testing. No real API calls are made.
 *
 * Implements the same public API surface as HEBClient so it can be
 * used as a drop-in replacement.
 */

import type {
  HEBConfig,
  HEBShoppingContext,
  Product,
  ProductSearchFilters,
  ProductSearchResult,
  Store,
  StoreInventory,
} from '../types.js';

import { HEBStoreError } from '../errors.js';

import { MockCartManager } from './cart.js';
import { MockOrderManager } from './order.js';
import { MOCK_PRODUCTS, MOCK_STORES } from './fixtures.js';

// ── MockHEBClient ───────────────────────────────────────────────────────────

/**
 * Mock HEB client for development and testing.
 *
 * Returns deterministic fixture data without making real API calls.
 * Session management methods are no-ops that set `isReady = true`.
 *
 * @example
 * ```ts
 * const client = new MockHEBClient({ storeId: '790', zipCode: '78701' });
 * await client.initWithCookies('mock-cookie');
 * const results = await client.searchProducts('milk');
 * ```
 */
export class MockHEBClient {
  private readonly config: {
    storeId: string;
    zipCode: string;
    shoppingContext: HEBShoppingContext;
    timeout?: number;
    debug?: boolean;
  };

  private _isReady = false;

  /** Lazily-initialised cart manager. */
  private _cart: MockCartManager | null = null;

  /** Lazily-initialised order manager. */
  private _order: MockOrderManager | null = null;

  constructor(config?: Partial<HEBConfig>) {
    this.config = {
      storeId: config?.storeId ?? '790',
      zipCode: config?.zipCode ?? '78701',
      shoppingContext: config?.shoppingContext ?? 'CURBSIDE_PICKUP',
      timeout: config?.timeout,
      debug: config?.debug,
    };
  }

  // ── Session management (no-ops) ────────────────────────────────────────

  /**
   * No-op initialisation with cookies.
   * Sets `isReady = true` immediately.
   */
  async initWithCookies(_cookieInput?: unknown): Promise<void> {
    this._isReady = true;
  }

  /**
   * No-op initialisation with tokens.
   * Sets `isReady = true` immediately.
   */
  async initWithTokens(_tokens?: unknown): Promise<void> {
    this._isReady = true;
  }

  /** Whether the mock client is "ready" (always true after init). */
  get isReady(): boolean {
    return this._isReady;
  }

  // ── Product search ─────────────────────────────────────────────────────

  /**
   * Search mock products by name (simple substring match).
   *
   * @param query   - Search term (e.g. "milk")
   * @param filters - Optional filters (respects `filters.limit`)
   */
  async searchProducts(query: string, filters?: ProductSearchFilters): Promise<ProductSearchResult> {
    const limit = filters?.limit ?? 20;
    const lowerQuery = query.toLowerCase();

    const matching = MOCK_PRODUCTS.filter((p) =>
      p.name.toLowerCase().includes(lowerQuery),
    );

    const products = matching.slice(0, limit);

    return {
      products,
      totalCount: matching.length,
      page: 1,
      hasNextPage: matching.length > limit,
    };
  }

  /**
   * Get a mock product by ID.
   *
   * @param productId - Product ID
   * @throws {HEBStoreError} If the product is not found
   */
  async getProduct(productId: string): Promise<Product> {
    const product = MOCK_PRODUCTS.find((p) => p.id === productId);
    if (!product) {
      throw new HEBStoreError(`Product not found: ${productId}`);
    }
    return { ...product };
  }

  /**
   * Check inventory for products at a store.
   * Returns all in-stock products as available.
   *
   * @param storeId    - Store ID
   * @param productIds - Product IDs to check
   */
  async getStoreInventory(storeId: string, productIds: string[]): Promise<StoreInventory[]> {
    return productIds.map((productId) => {
      const product = MOCK_PRODUCTS.find((p) => p.id === productId);
      const inStock = product?.inStock ?? false;
      return {
        productId,
        storeId,
        inStock,
        availableQuantity: inStock ? (product?.maxQuantity ?? 10) : 0,
      };
    });
  }

  // ── Store search ───────────────────────────────────────────────────────

  /**
   * Search mock stores.
   *
   * Returns 2-3 mock stores. If a query is provided, filters by
   * city name substring match.
   *
   * @param query - Optional city or ZIP code filter
   */
  async searchStores(query?: string): Promise<Store[]> {
    if (!query) {
      return MOCK_STORES.slice(0, 2);
    }

    const lowerQuery = query.toLowerCase();
    const matching = MOCK_STORES.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerQuery) ||
        s.address.city.toLowerCase().includes(lowerQuery) ||
        s.address.zip.includes(query),
    );

    // Return at least 2 stores if any match, otherwise return 2 default stores
    return matching.length >= 2
      ? matching.slice(0, 3)
      : MOCK_STORES.slice(0, 2);
  }

  /**
   * Set the active store (no-op, updates internal storeId).
   *
   * @param storeId - New store ID
   */
  async setStore(storeId: string): Promise<void> {
    this.config.storeId = storeId;
  }

  // ── Sub-managers ───────────────────────────────────────────────────────

  /** Access the mock cart manager (lazy-initialised). */
  get cart(): MockCartManager {
    if (!this._cart) {
      this._cart = new MockCartManager();
    }
    return this._cart;
  }

  /** Access the mock order manager (lazy-initialised). */
  get order(): MockOrderManager {
    if (!this._order) {
      this._order = new MockOrderManager();
    }
    return this._order;
  }
}
