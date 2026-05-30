/**
 * @mealme/heb — HEBClient
 *
 * Top-level client that wraps the heb-sdk-unofficial HEBClient
 * and provides the MealMe-typed API surface.
 *
 * Initialisation reads HEB_STORE_ID and HEB_ZIP_CODE from env vars
 * when explicit config values are not provided.
 */

import {
  HEBClient as SDKClient,
  HEBSession,
  createSessionFromCookies,
  createTokenSession,
  isSessionValid,
  setStore as sdkSetStore,
  getProductDetails,
  type SearchOptions,
  type HEBCookies,
  type HEBAuthTokens,
} from 'heb-sdk-unofficial';

import type {
  HEBConfig,
  HEBShoppingContext,
  Product,
  ProductSearchFilters,
  ProductSearchResult,
  Store,
  StoreInventory,
} from './types.js';

import { CartManager } from './cart.js';
import { OrderManager } from './order.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map raw SDK product → MealMe Product type. */
function mapProduct(raw: Awaited<ReturnType<typeof getProductDetails>>): Product {
  return {
    id: raw.productId,
    skuId: raw.skuId,
    name: raw.name,
    brand: raw.brand,
    description: raw.description ?? raw.longDescription,
    imageUrl: raw.imageUrl ?? raw.images?.[0],
    price: raw.price
      ? { amount: raw.price.amount, formatted: raw.price.formatted }
      : undefined,
    unit: raw.size,
    category: raw.category,
    inStock: raw.inStock,
    isAvailable: raw.isAvailable,
    maxQuantity: raw.maxQuantity,
    productUrl: raw.productUrl,
  };
}

/** Map raw SDK store → MealMe Store type. */
function mapStore(raw: { storeNumber: string; name: string; address: { streetAddress: string; city: string; state: string; zip: string }; distanceMiles?: number }): Store {
  return {
    id: raw.storeNumber,
    name: raw.name,
    address: {
      street: raw.address.streetAddress,
      city: raw.address.city,
      state: raw.address.state,
      zip: raw.address.zip,
    },
    distanceMiles: raw.distanceMiles,
  };
}

// ── HEBClient ───────────────────────────────────────────────────────────────

/**
 * MealMe HEB integration client.
 *
 * Wraps the unofficial HEB SDK and exposes a clean, typed API for
 * product search, cart management, and order placement.
 *
 * @example
 * ```ts
 * const client = new HEBClient({ storeId: '790', zipCode: '78701' });
 * // Or rely on env vars: HEB_STORE_ID, HEB_ZIP_CODE
 * const client = HEBClient.fromEnv();
 * ```
 */
export class HEBClient {
  private readonly config: Required<Pick<HEBConfig, 'storeId' | 'zipCode'>> &
    Pick<HEBConfig, 'shoppingContext' | 'timeout' | 'debug'>;

  private sdkClient: SDKClient | null = null;
  private session: HEBSession | null = null;

  /** Lazily-initialised cart manager. */
  private _cart: CartManager | null = null;

  /** Lazily-initialised order manager. */
  private _order: OrderManager | null = null;

  constructor(config: HEBConfig) {
    this.config = {
      storeId: config.storeId,
      zipCode: config.zipCode,
      shoppingContext: config.shoppingContext ?? 'CURBSIDE_PICKUP',
      timeout: config.timeout,
      debug: config.debug,
    };
  }

  // ── Factory ─────────────────────────────────────────────────────────────

  /**
   * Create an HEBClient using environment variables.
   *
   * Reads HEB_STORE_ID and HEB_ZIP_CODE (required), and optionally
   * HEB_SHOPPING_CONTEXT, HEB_TIMEOUT, and HEB_DEBUG.
   */
  static fromEnv(): HEBClient {
    const storeId = process.env.HEB_STORE_ID;
    const zipCode = process.env.HEB_ZIP_CODE;

    if (!storeId || !zipCode) {
      throw new Error(
        'HEB_STORE_ID and HEB_ZIP_CODE environment variables are required. ' +
          'Add them to your .env file (see .env.example).',
      );
    }

    return new HEBClient({
      storeId,
      zipCode,
      shoppingContext: process.env.HEB_SHOPPING_CONTEXT as HEBShoppingContext | undefined,
      timeout: process.env.HEB_TIMEOUT ? Number(process.env.HEB_TIMEOUT) : undefined,
      debug: process.env.HEB_DEBUG === 'true',
    });
  }

  // ── Session management ─────────────────────────────────────────────────

  /**
   * Initialise the client with a cookie-based session.
   *
   * @param cookieInput - Cookie header string (e.g. from browser DevTools)
   *                      or a pre-built HEBCookies object.
   */
  async initWithCookies(cookieInput: string | HEBCookies): Promise<void> {
    const cookieStr = typeof cookieInput === 'string'
      ? cookieInput
      : formatCookies(cookieInput);

    this.session = createSessionFromCookies(cookieStr);

    if (this.config.debug) {
      this.session.debug = true;
    }

    await this.ensureStoreContext();
    this.sdkClient = new SDKClient(this.session);
  }

  /**
   * Initialise the client with bearer-token authentication.
   *
   * @param tokens - OAuth tokens from HEB authentication.
   */
  async initWithTokens(tokens: HEBAuthTokens): Promise<void> {
    this.session = createTokenSession(tokens);

    if (this.config.debug) {
      this.session.debug = true;
    }

    if (this.config.shoppingContext) {
      this.session.shoppingContext = this.config.shoppingContext;
    }

    await this.ensureStoreContext();
    this.sdkClient = new SDKClient(this.session);
  }

  /**
   * Set the store context on the session so all subsequent requests
   * use the configured store.
   */
  private async ensureStoreContext(): Promise<void> {
    if (!this.session) return;

    // Set the shopping context
    if (this.config.shoppingContext) {
      this.session.shoppingContext = this.config.shoppingContext;
    }

    // Set the store on the session
    try {
      await sdkSetStore(this.session, this.config.storeId);
    } catch {
      // Non-fatal — some operations work without store context
    }
  }

  /** Check whether the current session is still valid. */
  get isReady(): boolean {
    return this.session !== null && isSessionValid(this.session);
  }

  /** Get information about the current session. */
  getSessionInfo(): { storeId: string; isValid: boolean; expiresAt: Date | undefined; shoppingContext: string } | null {
    if (!this.sdkClient) return null;
    return this.sdkClient.getSessionInfo();
  }

  /** Require an active SDK client or throw. */
  private requireClient(): SDKClient {
    if (!this.sdkClient) {
      throw new Error(
        'HEBClient is not initialised. Call initWithCookies() or initWithTokens() first.',
      );
    }
    return this.sdkClient;
  }

  /** Require an active session or throw. */
  private requireSession(): HEBSession {
    if (!this.session) {
      throw new Error(
        'HEBClient is not initialised. Call initWithCookies() or initWithTokens() first.',
      );
    }
    return this.session;
  }

  // ── Product search ─────────────────────────────────────────────────────

  /**
   * Search the HEB product catalog.
   *
   * @param query   - Search term (e.g. "organic milk")
   * @param filters - Optional filters (limit, storeId, shoppingContext, etc.)
   */
  async searchProducts(query: string, filters?: ProductSearchFilters): Promise<ProductSearchResult> {
    const client = this.requireClient();
    const options: SearchOptions = {
      limit: filters?.limit ?? 20,
      storeId: filters?.storeId ?? this.config.storeId,
      shoppingContext: filters?.shoppingContext ?? this.config.shoppingContext,
      includeImages: filters?.includeImages,
    };

    const raw = await client.search(query, options);

    return {
      products: raw.products.map(mapProduct),
      totalCount: raw.totalCount,
      page: raw.page,
      hasNextPage: raw.hasNextPage,
      nextCursor: raw.nextCursor,
    };
  }

  /**
   * Get full details for a single product.
   *
   * @param productId - HEB product ID
   */
  async getProduct(productId: string): Promise<Product> {
    const client = this.requireClient();
    const raw = await client.getProduct(productId);
    return mapProduct(raw);
  }

  /**
   * Check inventory availability for one or more products at a store.
   *
   * @param storeId    - Store number to check
   * @param productIds - Product IDs to check
   */
  async getStoreInventory(storeId: string, productIds: string[]): Promise<StoreInventory[]> {
    const session = this.requireSession();
    const results: StoreInventory[] = [];

    for (const productId of productIds) {
      try {
        const product = await getProductDetails(session, productId);

        results.push({
          productId,
          storeId,
          inStock: product.inStock ?? product.isAvailable ?? false,
          availableQuantity: product.maxQuantity,
        });
      } catch {
        results.push({
          productId,
          storeId,
          inStock: false,
        });
      }
    }

    return results;
  }

  // ── Store search ───────────────────────────────────────────────────────

  /**
   * Search for HEB stores near a location.
   *
   * @param query  - Address, ZIP code, or city name
   */
  async searchStores(query?: string): Promise<Store[]> {
    const client = this.requireClient();
    const raw = await client.searchStores(query ?? this.config.zipCode);
    return raw.map(mapStore);
  }

  /**
   * Change the active store for the session.
   *
   * @param storeId - New store ID
   */
  async setStore(storeId: string): Promise<void> {
    const client = this.requireClient();
    await client.setStore(storeId);
    // Update local config so subsequent calls use the new store
    (this.config as { storeId: string }).storeId = storeId;
  }

  // ── Sub-managers ───────────────────────────────────────────────────────

  /** Access the cart manager (lazy-initialised). */
  get cart(): CartManager {
    if (!this._cart) {
      this._cart = new CartManager(this);
    }
    return this._cart;
  }

  /** Access the order manager (lazy-initialised). */
  get order(): OrderManager {
    if (!this._order) {
      this._order = new OrderManager(this);
    }
    return this._order;
  }

  // ── Internal accessors (used by sub-managers) ──────────────────────────

  /** @internal Expose the SDK client to sub-managers. */
  _getSDKClient(): SDKClient {
    return this.requireClient();
  }

  /** @internal Expose the session to sub-managers. */
  _getSession(): HEBSession {
    return this.requireSession();
  }

  /** @internal Expose the config store ID. */
  _getStoreId(): string {
    return this.config.storeId;
  }
}

// ── Utility ─────────────────────────────────────────────────────────────────

/** Format HEBCookies back into a cookie header string. */
function formatCookies(cookies: HEBCookies): string {
  return Object.entries(cookies)
    .filter(([, v]) => typeof v === 'string')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}
