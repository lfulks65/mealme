/**
 * @mealme/heb — OrderManager
 *
 * Manages HEB order placement and tracking through the SDK client.
 *
 * NOTE: The heb-sdk-unofficial does not expose a direct "submit order"
 * mutation.  Order submission in the HEB ecosystem is a multi-step
 * process (reserve timeslot → add items → select payment → submit).
 * The `submitOrder` method here orchestrates the known steps and
 * returns a best-effort result.  Full checkout flow may require
 * additional payment selection that is outside the SDK's scope.
 */

import type { HEBClient } from './client.js';
import type {
  DeliveryDetails,
  Order,
  OrderListResult,
  ListOrdersOptions,
  ProductPrice,
} from './types.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Map a raw history order to the MealMe Order type. */
function mapHistoryOrder(raw: {
  orderId: string;
  orderStatusMessageShort?: string;
  status?: string;
  fulfillmentType?: string;
  totalPrice?: { formattedAmount?: string };
  priceDetails?: {
    total?: { formattedAmount?: string };
    subtotal?: { formattedAmount?: string };
    tax?: { formattedAmount?: string };
  };
  orderTimeslot?: {
    startDateTime?: string;
    endDateTime?: string;
    formattedStartTime?: string;
    formattedEndTime?: string;
    formattedDate?: string;
  };
  store?: {
    name?: string;
  };
  productCount?: number;
}): Order {
  return {
    orderId: raw.orderId,
    status: raw.status ?? raw.orderStatusMessageShort ?? 'UNKNOWN',
    fulfillmentType: raw.fulfillmentType,
    items: [], // History list does not include items
    total: raw.priceDetails?.total
      ? parseFormattedPrice(raw.priceDetails.total.formattedAmount)
      : raw.totalPrice?.formattedAmount
        ? parseFormattedPrice(raw.totalPrice.formattedAmount)
        : undefined,
    tax: raw.priceDetails?.tax
      ? parseFormattedPrice(raw.priceDetails.tax.formattedAmount)
      : undefined,
    timeslot: raw.orderTimeslot
      ? {
          startDateTime: raw.orderTimeslot.startDateTime,
          endDateTime: raw.orderTimeslot.endDateTime,
          formattedStartTime: raw.orderTimeslot.formattedStartTime,
          formattedEndTime: raw.orderTimeslot.formattedEndTime,
          formattedDate: raw.orderTimeslot.formattedDate,
        }
      : undefined,
    store: raw.store ? { name: raw.store.name } : undefined,
  };
}

/** Map a raw order detail to the MealMe Order type. */
function mapOrderDetail(raw: {
  orderId: string;
  status: string;
  fulfillmentType?: string;
  orderPlacedOnDateTime?: string;
  priceDetails?: {
    subtotal?: { formattedAmount?: string };
    total?: { formattedAmount?: string };
    tax?: { formattedAmount?: string };
  };
  orderTimeslot?: {
    startDateTime?: string;
    endDateTime?: string;
    formattedStartTime?: string;
    formattedEndTime?: string;
    formattedDate?: string;
  };
  store?: {
    id?: string;
    name?: string;
    address?: string;
  };
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    price: string;
    unitPrice: number;
    image?: string;
  }>;
}): Order {
  return {
    orderId: raw.orderId,
    status: raw.status,
    fulfillmentType: raw.fulfillmentType,
    items: raw.items ?? [],
    subtotal: raw.priceDetails?.subtotal
      ? parseFormattedPrice(raw.priceDetails.subtotal.formattedAmount)
      : undefined,
    total: raw.priceDetails?.total
      ? parseFormattedPrice(raw.priceDetails.total.formattedAmount)
      : undefined,
    tax: raw.priceDetails?.tax
      ? parseFormattedPrice(raw.priceDetails.tax.formattedAmount)
      : undefined,
    placedAt: raw.orderPlacedOnDateTime,
    timeslot: raw.orderTimeslot
      ? {
          startDateTime: raw.orderTimeslot.startDateTime,
          endDateTime: raw.orderTimeslot.endDateTime,
          formattedStartTime: raw.orderTimeslot.formattedStartTime,
          formattedEndTime: raw.orderTimeslot.formattedEndTime,
          formattedDate: raw.orderTimeslot.formattedDate,
        }
      : undefined,
    store: raw.store
      ? { id: raw.store.id, name: raw.store.name, address: raw.store.address }
      : undefined,
  };
}

/** Parse a formatted price string like "$26.44" into a ProductPrice. */
function parseFormattedPrice(formatted?: string): ProductPrice | undefined {
  if (!formatted) return undefined;
  const amount = parseFloat(formatted.replace(/[^0-9.]/g, ''));
  return { amount: isNaN(amount) ? 0 : amount, formatted };
}

// ── OrderManager ─────────────────────────────────────────────────────────────

/**
 * Manages HEB orders.
 *
 * Provides methods to submit orders, track order status,
 * and retrieve order history.
 */
export class OrderManager {
  constructor(private readonly client: HEBClient) {}

  /**
   * Submit an order for the current cart.
   *
   * This orchestrates the HEB checkout flow:
   * 1. Reserve a fulfillment timeslot
   * 2. Return the reservation result (orderId, deadline, etc.)
   *
   * NOTE: Full order submission (payment selection, final submit)
   * may require additional steps outside the SDK's current scope.
   * The returned Order contains the reservation details which can
   * be used to complete checkout.
   *
   * @param _cartId         - Cart ID (session-scoped, currently unused)
   * @param deliveryDetails - Delivery / fulfillment details
   */
  async submitOrder(_cartId: string, deliveryDetails: DeliveryDetails): Promise<Order> {
    await this.client._rateLimit();
    const sdk = this.client._getSDKClient();

    // Reserve the fulfillment timeslot — use the appropriate method
    // based on fulfillment type
    let reservation: { success: boolean; orderId?: string };

    if (deliveryDetails.fulfillmentType === 'DELIVERY') {
      // Delivery requires an address
      reservation = await sdk.reserveSlot(
        deliveryDetails.slotId,
        deliveryDetails.slotDate,
        {
          address1: deliveryDetails.address.address1,
          address2: deliveryDetails.address.address2,
          city: deliveryDetails.address.city,
          state: deliveryDetails.address.state,
          postalCode: deliveryDetails.address.postalCode,
          nickname: deliveryDetails.address.nickname,
        },
        deliveryDetails.storeId,
      );
    } else {
      // Pickup / curbside — no address needed
      reservation = await sdk.reserveCurbsideSlot(
        deliveryDetails.slotId,
        deliveryDetails.slotDate,
        deliveryDetails.storeId,
      );
    }

    // Build an order object from the reservation
    return {
      orderId: reservation.orderId ?? 'pending',
      status: reservation.success ? 'RESERVED' : 'RESERVATION_FAILED',
      fulfillmentType: deliveryDetails.fulfillmentType,
      items: [], // Items are still in the cart at this point
      placedAt: undefined,
      store: { id: deliveryDetails.storeId },
    };
  }

  /**
   * Get the current status of an order.
   *
   * @param orderId - HEB order ID
   */
  async getOrderStatus(orderId: string): Promise<Order> {
    await this.client._rateLimit();
    const sdk = this.client._getSDKClient();

    const raw = await sdk.getOrder(orderId);

    // The SDK returns a complex nested structure; normalise it
    const pageOrder = raw.page?.pageProps?.order;
    if (pageOrder) {
      // pageOrder.store comes from the [key: string]: unknown index signature
      const pageStore = pageOrder.store as
        | { id?: string; name?: string; address?: string }
        | undefined;
      return mapOrderDetail({
        orderId: pageOrder.orderId,
        status: pageOrder.status,
        fulfillmentType: pageOrder.fulfillmentType,
        orderPlacedOnDateTime: pageOrder.orderPlacedOnDateTime,
        priceDetails: pageOrder.priceDetails,
        orderTimeslot: pageOrder.orderTimeslot,
        store: pageStore
          ? {
              id: pageStore.id,
              name: pageStore.name,
              address: pageStore.address,
            }
          : undefined,
        items: pageOrder.items,
      });
    }

    // Fallback: return minimal order from graphql response
    const gqlData = raw.graphql?.data;
    const gqlOrder = gqlData?.orderDetails ?? gqlData?.orderDetailsRequest?.order ?? undefined;

    if (gqlOrder) {
      const gqlStore = gqlOrder.store;
      return mapOrderDetail({
        orderId: gqlOrder.orderId ?? orderId,
        status: gqlOrder.status ?? gqlOrder.orderStatusMessageShort ?? 'UNKNOWN',
        fulfillmentType: gqlOrder.fulfillmentType,
        orderPlacedOnDateTime: gqlOrder.orderPlacedOnDateTime,
        priceDetails: gqlOrder.priceDetails,
        orderTimeslot: gqlOrder.orderTimeslot,
        store: gqlStore
          ? {
              id: gqlStore.id,
              name: gqlStore.name,
              address: gqlStore.address,
            }
          : undefined,
        items: gqlOrder.orderItems?.map((item) => ({
          id: item.product.id,
          name: item.product.fullDisplayName,
          quantity: item.quantity,
          price: item.unitPrice?.formattedAmount ?? '',
          unitPrice: item.unitPrice?.amount ?? 0,
          image: item.product.thumbnailImageUrls?.[0]?.url,
        })),
      });
    }

    // Last resort
    return {
      orderId,
      status: 'UNKNOWN',
      items: [],
    };
  }

  /**
   * List order history.
   *
   * @param options - Pagination options (page, size)
   */
  async listOrders(options?: ListOrdersOptions): Promise<OrderListResult> {
    await this.client._rateLimit();
    const sdk = this.client._getSDKClient();

    const raw = await sdk.getOrders({
      page: options?.page ?? 1,
      size: options?.size ?? 10,
    });

    const orders = raw.pageProps?.orders ?? [];

    return {
      orders: orders.map(mapHistoryOrder),
      page: raw.pagination?.page ?? 1,
      hasMore: raw.pagination?.hasMore ?? false,
    };
  }
}
