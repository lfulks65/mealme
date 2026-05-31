/**
 * @mealme/heb — Zod schema tests
 *
 * Uses Node's built-in test runner (`node:test`).
 * Run with: node --test packages/heb/src/__tests__/schemas.test.ts
 *           (or via tsx for .ts support)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  HEBConfigSchema,
  HEBShoppingContextSchema,
  HEBFulfillmentTypeSchema,
  ProductPriceSchema,
  ProductSchema,
  ProductSearchFiltersSchema,
  ProductSearchResultSchema,
  StoreAddressSchema,
  StoreSchema,
  StoreInventorySchema,
  CartItemSchema,
  CartFeeSchema,
  CartSchema,
  DeliveryAddressSchema,
  DeliveryDetailsSchema,
  FulfillmentSlotSchema,
  OrderItemSchema,
  OrderTimeslotSchema,
  OrderStoreSchema,
  OrderSchema,
  OrderListResultSchema,
  ListOrdersOptionsSchema,
} from '../schemas.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Assert that parsing `input` with `schema` succeeds. */
function assertValid<T>(schema: import('zod').ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  assert.ok(result.success, `Expected valid, got errors: ${JSON.stringify((result as any).error?.issues)}`);
  return (result as { success: true; data: T }).data;
}

/** Assert that parsing `input` with `schema` fails. */
function assertInvalid<T>(schema: import('zod').ZodType<T>, input: unknown): void {
  const result = schema.safeParse(input);
  assert.ok(!result.success, `Expected invalid, but parse succeeded: ${JSON.stringify(input)}`);
}

// ── Test data ───────────────────────────────────────────────────────────────

const validProductPrice = { amount: 3.99, formatted: '$3.99' };
const validStoreAddress = { street: '123 Main St', city: 'San Antonio', state: 'TX', zip: '78201' };
const validDeliveryAddress = { address1: '456 Oak Ave', city: 'Austin', state: 'TX', postalCode: '73301' };

// ── ProductPriceSchema ──────────────────────────────────────────────────────

describe('ProductPriceSchema', () => {
  it('accepts a valid price', () => {
    const data = assertValid(ProductPriceSchema, validProductPrice);
    assert.equal(data.amount, 3.99);
    assert.equal(data.formatted, '$3.99');
  });

  it('rejects missing amount', () => {
    assertInvalid(ProductPriceSchema, { formatted: '$3.99' });
  });

  it('rejects non-number amount', () => {
    assertInvalid(ProductPriceSchema, { amount: '3.99', formatted: '$3.99' });
  });

  it('rejects empty formatted string', () => {
    assertInvalid(ProductPriceSchema, { amount: 3.99, formatted: '' });
  });
});

// ── ProductSchema ───────────────────────────────────────────────────────────

describe('ProductSchema', () => {
  const validProduct = {
    id: 'prod-1',
    skuId: 'sku-1',
    name: 'HEB Organic Milk',
    brand: 'HEB',
    price: validProductPrice,
    inStock: true,
    maxQuantity: 10,
  };

  it('accepts a valid product', () => {
    const data = assertValid(ProductSchema, validProduct);
    assert.equal(data.id, 'prod-1');
    assert.equal(data.brand, 'HEB');
  });

  it('accepts a product with only required fields', () => {
    assertValid(ProductSchema, { id: 'p1', skuId: 's1', name: 'Bread' });
  });

  it('rejects missing required id', () => {
    assertInvalid(ProductSchema, { skuId: 's1', name: 'Bread' });
  });

  it('rejects invalid imageUrl', () => {
    assertInvalid(ProductSchema, { ...validProduct, imageUrl: 'not-a-url' });
  });

  it('rejects negative maxQuantity', () => {
    assertInvalid(ProductSchema, { ...validProduct, maxQuantity: -1 });
  });
});

// ── ProductSearchFiltersSchema ──────────────────────────────────────────────

describe('ProductSearchFiltersSchema', () => {
  it('accepts empty object (all optional)', () => {
    assertValid(ProductSearchFiltersSchema, {});
  });

  it('accepts valid filters', () => {
    const data = assertValid(ProductSearchFiltersSchema, { limit: 10, storeId: 'store-1', includeImages: true });
    assert.equal(data.limit, 10);
  });

  it('rejects invalid shoppingContext', () => {
    assertInvalid(ProductSearchFiltersSchema, { shoppingContext: 'INVALID' });
  });
});

// ── ProductSearchResultSchema ───────────────────────────────────────────────

describe('ProductSearchResultSchema', () => {
  it('accepts a valid search result', () => {
    const data = assertValid(ProductSearchResultSchema, {
      products: [{ id: 'p1', skuId: 's1', name: 'Milk' }],
      totalCount: 1,
      page: 0,
      hasNextPage: false,
    });
    assert.equal(data.products.length, 1);
  });

  it('rejects missing products array', () => {
    assertInvalid(ProductSearchResultSchema, { totalCount: 0, page: 0, hasNextPage: false });
  });
});

// ── StoreAddressSchema ──────────────────────────────────────────────────────

describe('StoreAddressSchema', () => {
  it('accepts a valid address', () => {
    assertValid(StoreAddressSchema, validStoreAddress);
  });

  it('rejects missing city', () => {
    assertInvalid(StoreAddressSchema, { street: '123 Main St', state: 'TX', zip: '78201' });
  });
});

// ── StoreSchema ─────────────────────────────────────────────────────────────

describe('StoreSchema', () => {
  it('accepts a valid store', () => {
    const data = assertValid(StoreSchema, { id: 'store-1', name: 'HEB Plus', address: validStoreAddress });
    assert.equal(data.name, 'HEB Plus');
  });

  it('rejects store without address', () => {
    assertInvalid(StoreSchema, { id: 'store-1', name: 'HEB Plus' });
  });
});

// ── StoreInventorySchema ────────────────────────────────────────────────────

describe('StoreInventorySchema', () => {
  it('accepts valid inventory', () => {
    assertValid(StoreInventorySchema, { productId: 'p1', storeId: 's1', inStock: true });
  });

  it('rejects missing inStock', () => {
    assertInvalid(StoreInventorySchema, { productId: 'p1', storeId: 's1' });
  });
});

// ── CartItemSchema ──────────────────────────────────────────────────────────

describe('CartItemSchema', () => {
  it('accepts a valid cart item', () => {
    const data = assertValid(CartItemSchema, { productId: 'p1', skuId: 's1', quantity: 2, price: validProductPrice });
    assert.equal(data.quantity, 2);
  });

  it('rejects zero quantity', () => {
    assertInvalid(CartItemSchema, { productId: 'p1', skuId: 's1', quantity: 0 });
  });

  it('rejects negative quantity', () => {
    assertInvalid(CartItemSchema, { productId: 'p1', skuId: 's1', quantity: -1 });
  });
});

// ── CartFeeSchema ───────────────────────────────────────────────────────────

describe('CartFeeSchema', () => {
  it('accepts a valid fee', () => {
    assertValid(CartFeeSchema, { id: 'fee-1', displayName: 'Delivery Fee', feeType: 'DELIVERY', amount: validProductPrice });
  });

  it('rejects missing amount', () => {
    assertInvalid(CartFeeSchema, { id: 'fee-1', displayName: 'Delivery Fee', feeType: 'DELIVERY' });
  });
});

// ── CartSchema ──────────────────────────────────────────────────────────────

describe('CartSchema', () => {
  const validCart = {
    id: 'cart-1',
    storeId: 'store-1',
    items: [{ productId: 'p1', skuId: 's1', quantity: 2 }],
    itemCount: 1,
    subtotal: validProductPrice,
    total: validProductPrice,
    fees: [],
  };

  it('accepts a valid cart', () => {
    const data = assertValid(CartSchema, validCart);
    assert.equal(data.id, 'cart-1');
    assert.equal(data.items.length, 1);
  });

  it('accepts a cart with tax and savings', () => {
    assertValid(CartSchema, { ...validCart, tax: validProductPrice, savings: validProductPrice });
  });

  it('rejects missing required fields', () => {
    assertInvalid(CartSchema, { id: 'cart-1', storeId: 'store-1' });
  });

  it('rejects invalid items array', () => {
    assertInvalid(CartSchema, { ...validCart, items: 'not-an-array' });
  });
});

// ── DeliveryAddressSchema ───────────────────────────────────────────────────

describe('DeliveryAddressSchema', () => {
  it('accepts a valid delivery address', () => {
    assertValid(DeliveryAddressSchema, validDeliveryAddress);
  });

  it('accepts optional address2 and nickname', () => {
    assertValid(DeliveryAddressSchema, { ...validDeliveryAddress, address2: 'Apt 2', nickname: 'Home' });
  });

  it('rejects missing postalCode', () => {
    assertInvalid(DeliveryAddressSchema, { address1: '456 Oak Ave', city: 'Austin', state: 'TX' });
  });
});

// ── DeliveryDetailsSchema ───────────────────────────────────────────────────

describe('DeliveryDetailsSchema', () => {
  const validDetails = {
    address: validDeliveryAddress,
    fulfillmentType: 'DELIVERY' as const,
    slotId: 'slot-1',
    slotDate: '2025-01-15',
    storeId: 'store-1',
  };

  it('accepts valid delivery details', () => {
    const data = assertValid(DeliveryDetailsSchema, validDetails);
    assert.equal(data.fulfillmentType, 'DELIVERY');
  });

  it('accepts PICKUP fulfillment type', () => {
    assertValid(DeliveryDetailsSchema, { ...validDetails, fulfillmentType: 'PICKUP' });
  });

  it('rejects invalid fulfillmentType', () => {
    assertInvalid(DeliveryDetailsSchema, { ...validDetails, fulfillmentType: 'INVALID' });
  });

  it('rejects invalid slotDate format', () => {
    assertInvalid(DeliveryDetailsSchema, { ...validDetails, slotDate: '01-15-2025' });
  });

  it('rejects missing address', () => {
    assertInvalid(DeliveryDetailsSchema, {
      fulfillmentType: 'DELIVERY',
      slotId: 'slot-1',
      slotDate: '2025-01-15',
      storeId: 'store-1',
    });
  });
});

// ── FulfillmentSlotSchema ───────────────────────────────────────────────────

describe('FulfillmentSlotSchema', () => {
  const validSlot = {
    slotId: 'slot-1',
    date: '2025-01-15',
    startTime: '08:00',
    endTime: '09:00',
    formattedStartTime: '8:00 AM',
    formattedEndTime: '9:00 AM',
    formattedDate: 'Jan 15, 2025',
    fee: 4.99,
    isAvailable: true,
  };

  it('accepts a valid slot', () => {
    assertValid(FulfillmentSlotSchema, validSlot);
  });

  it('rejects negative fee', () => {
    assertInvalid(FulfillmentSlotSchema, { ...validSlot, fee: -1 });
  });
});

// ── OrderItemSchema ─────────────────────────────────────────────────────────

describe('OrderItemSchema', () => {
  it('accepts a valid order item', () => {
    assertValid(OrderItemSchema, { id: 'oi-1', name: 'Milk', quantity: 1, price: '$3.99', unitPrice: 3.99 });
  });

  it('rejects zero quantity', () => {
    assertInvalid(OrderItemSchema, { id: 'oi-1', name: 'Milk', quantity: 0, price: '$3.99', unitPrice: 3.99 });
  });
});

// ── OrderTimeslotSchema ─────────────────────────────────────────────────────

describe('OrderTimeslotSchema', () => {
  it('accepts empty object (all optional)', () => {
    assertValid(OrderTimeslotSchema, {});
  });

  it('accepts full timeslot', () => {
    assertValid(OrderTimeslotSchema, {
      startDateTime: '2025-01-15T08:00:00Z',
      endDateTime: '2025-01-15T09:00:00Z',
      formattedStartTime: '8:00 AM',
      formattedEndTime: '9:00 AM',
      formattedDate: 'Jan 15, 2025',
    });
  });
});

// ── OrderStoreSchema ────────────────────────────────────────────────────────

describe('OrderStoreSchema', () => {
  it('accepts empty object (all optional)', () => {
    assertValid(OrderStoreSchema, {});
  });

  it('accepts full store info', () => {
    assertValid(OrderStoreSchema, { id: 'store-1', name: 'HEB', address: '123 Main St' });
  });
});

// ── OrderSchema ─────────────────────────────────────────────────────────────

describe('OrderSchema', () => {
  const validOrder = {
    orderId: 'order-1',
    status: 'PLACED',
    items: [{ id: 'oi-1', name: 'Milk', quantity: 1, price: '$3.99', unitPrice: 3.99 }],
  };

  it('accepts a valid order', () => {
    const data = assertValid(OrderSchema, validOrder);
    assert.equal(data.orderId, 'order-1');
  });

  it('accepts order with all optional fields', () => {
    assertValid(OrderSchema, {
      ...validOrder,
      fulfillmentType: 'DELIVERY',
      subtotal: validProductPrice,
      total: validProductPrice,
      tax: validProductPrice,
      placedAt: '2025-01-15T10:00:00Z',
      timeslot: { formattedDate: 'Jan 15, 2025' },
      store: { name: 'HEB' },
    });
  });

  it('rejects missing orderId', () => {
    assertInvalid(OrderSchema, { status: 'PLACED', items: [] });
  });

  it('rejects empty status', () => {
    assertInvalid(OrderSchema, { ...validOrder, status: '' });
  });
});

// ── OrderListResultSchema ───────────────────────────────────────────────────

describe('OrderListResultSchema', () => {
  it('accepts a valid result', () => {
    assertValid(OrderListResultSchema, { orders: [], page: 0, hasMore: false });
  });

  it('rejects missing hasMore', () => {
    assertInvalid(OrderListResultSchema, { orders: [], page: 0 });
  });
});

// ── ListOrdersOptionsSchema ─────────────────────────────────────────────────

describe('ListOrdersOptionsSchema', () => {
  it('accepts empty object (all optional)', () => {
    assertValid(ListOrdersOptionsSchema, {});
  });

  it('accepts valid options', () => {
    assertValid(ListOrdersOptionsSchema, { page: 1, size: 20 });
  });

  it('rejects negative page', () => {
    assertInvalid(ListOrdersOptionsSchema, { page: -1 });
  });
});

// ── HEBConfigSchema ─────────────────────────────────────────────────────────

describe('HEBConfigSchema', () => {
  it('accepts a valid config', () => {
    const data = assertValid(HEBConfigSchema, { storeId: 'store-1', zipCode: '78201' });
    assert.equal(data.storeId, 'store-1');
  });

  it('accepts config with all options', () => {
    assertValid(HEBConfigSchema, {
      storeId: 'store-1',
      zipCode: '78201',
      shoppingContext: 'CURBSIDE_PICKUP',
      timeout: 30000,
      debug: true,
    });
  });

  it('rejects missing storeId', () => {
    assertInvalid(HEBConfigSchema, { zipCode: '78201' });
  });

  it('rejects empty storeId', () => {
    assertInvalid(HEBConfigSchema, { storeId: '', zipCode: '78201' });
  });
});

// ── HEBShoppingContextSchema ────────────────────────────────────────────────

describe('HEBShoppingContextSchema', () => {
  it('accepts valid contexts', () => {
    assertValid(HEBShoppingContextSchema, 'CURBSIDE_PICKUP');
    assertValid(HEBShoppingContextSchema, 'CURBSIDE_DELIVERY');
    assertValid(HEBShoppingContextSchema, 'EXPLORE_MY_STORE');
  });

  it('rejects invalid context', () => {
    assertInvalid(HEBShoppingContextSchema, 'INVALID');
  });
});

// ── HEBFulfillmentTypeSchema ───────────────────────────────────────────────

describe('HEBFulfillmentTypeSchema', () => {
  it('accepts valid types', () => {
    assertValid(HEBFulfillmentTypeSchema, 'DELIVERY');
    assertValid(HEBFulfillmentTypeSchema, 'PICKUP');
  });

  it('rejects invalid type', () => {
    assertInvalid(HEBFulfillmentTypeSchema, 'SHIPPING');
  });
});
