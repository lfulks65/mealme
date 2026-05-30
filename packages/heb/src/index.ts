/**
 * @mealme/heb
 *
 * HEB SDK integration shell for the MealMe platform.
 * Provides types and client for HEB grocery API integration.
 */

// HEB API configuration
export interface HebClientConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

// HEB product types
export interface HebProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  unit: string;
  imageUrl?: string;
  inStock: boolean;
  category?: string;
}

export interface HebStore {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
}

export interface HebCart {
  id: string;
  items: HebCartItem[];
  storeId: string;
  total: number;
}

export interface HebCartItem {
  productId: string;
  quantity: number;
  product?: HebProduct;
}

// HEB client shell
export function createHebClient(config: HebClientConfig) {
  const baseUrl = config.baseUrl ?? 'https://api.heb.com/v1';

  return {
    config: { ...config, baseUrl },
    // Methods will be implemented here
    // async searchProducts(query: string): Promise<HebProduct[]> { ... }
    // async getNearbyStores(zip: string): Promise<HebStore[]> { ... }
    // async createCart(storeId: string): Promise<HebCart> { ... }
    // async addToCart(cartId: string, item: HebCartItem): Promise<HebCart> { ... }
  };
}

export type HebClient = ReturnType<typeof createHebClient>;
