/**
 * @mealme/heb — MockOrderManager
 *
 * In-memory order tracking for development and testing.
 * Creates and stores mock orders without making real API calls.
 */

import type {
  DeliveryDetails,
  Order,
  OrderListResult,
  ListOrdersOptions,
} from '../types.js';
import { HEBOrderError } from '../errors.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a unique order ID. */
let orderCounter = 0;
function nextOrderId(): string {
  orderCounter += 1;
  return `mock-order-${String(orderCounter).padStart(6, '0')}`;
}

// ── In-memory order store ───────────────────────────────────────────────────

interface StoredOrder extends Order {
  /** When the order was created (ISO string). */
  createdAt: string;
}

// ── MockOrderManager ────────────────────────────────────────────────────────

/**
 * In-memory order manager for development and testing.
 *
 * All order state is held in memory and lost when the process exits.
 * Implements the same public API as OrderManager but returns
 * deterministic data.
 */
export class MockOrderManager {
  private orders = new Map<string, StoredOrder>();

  /**
   * Submit an order for the current cart.
   *
   * Creates a mock order with status `RESERVED` and stores it in memory.
   *
   * @param _cartId         - Cart ID (unused in mock)
   * @param deliveryDetails - Delivery / fulfillment details
   */
  async submitOrder(_cartId: string, deliveryDetails: DeliveryDetails): Promise<Order> {
    const orderId = nextOrderId();
    const now = new Date().toISOString();

    const order: StoredOrder = {
      orderId,
      status: 'RESERVED',
      fulfillmentType: deliveryDetails.fulfillmentType,
      items: [],
      placedAt: now,
      store: { id: deliveryDetails.storeId },
      createdAt: now,
    };

    this.orders.set(orderId, order);
    return { ...order };
  }

  /**
   * Get the current status of an order.
   *
   * @param orderId - Order ID
   * @throws {HEBOrderError} If the order is not found
   */
  async getOrderStatus(orderId: string): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new HEBOrderError(`Order not found: ${orderId}`);
    }
    return { ...order };
  }

  /**
   * List stored orders with pagination.
   *
   * @param options - Pagination options (page, size)
   */
  async listOrders(options?: ListOrdersOptions): Promise<OrderListResult> {
    const page = options?.page ?? 1;
    const size = options?.size ?? 10;

    const allOrders = Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const start = (page - 1) * size;
    const end = start + size;
    const pageOrders = allOrders.slice(start, end);
    const hasMore = end < allOrders.length;

    return {
      orders: pageOrders.map((o) => ({ ...o })),
      page,
      hasMore,
    };
  }
}
