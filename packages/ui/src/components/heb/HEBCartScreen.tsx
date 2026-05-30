/**
 * HEBCartScreen — HEB cart with totals, delivery/pickup options, submit
 *
 * Shows the current HEB cart contents with item management,
 * subtotal/fees/totals, fulfillment type selection (delivery or pickup),
 * timeslot selection, and order submission.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  Image,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import type { StoreInfo, OrderStatusInfo } from '@mealme/api';
import type { Cart, CartItem, FulfillmentSlot } from '@mealme/heb';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HEBCartScreenProps {
  /** Family ID for auth context. */
  familyId: string;
  /** Cart ID (session-scoped). */
  cartId: string;
  /** Selected HEB store info. */
  store: StoreInfo;
  /** Called when order is submitted. */
  onOrderSubmitted: (order: OrderStatusInfo) => void;
  /** Called when the user goes back. */
  onBack?: () => void;
  /** Container style. */
  style?: ViewStyle;
}

// ─── Cart Item Row ───────────────────────────────────────────────────────────

interface CartItemRowProps {
  item: CartItem;
  onRemove: (productId: string) => void;
}

function CartItemRow({ item, onRemove }: CartItemRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
    >
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={{ width: 48, height: 48, borderRadius: 8, marginRight: 12 }}
          resizeMode="contain"
        />
      ) : (
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 8,
            backgroundColor: '#f3f4f6',
            marginRight: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 20 }}>🛒</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' } as TextStyle}>
          {item.name ?? 'Unknown item'}
        </Text>
        {item.brand && (
          <Text style={{ fontSize: 12, color: '#6b7280' } as TextStyle}>{item.brand}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' } as TextStyle}>
            {item.price?.formatted ?? '—'}
          </Text>
          <Text style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 } as TextStyle}>
            Qty: {item.quantity}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(item.productId)}
        style={{
          backgroundColor: '#fef2f2',
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', color: '#dc2626' } as TextStyle}>
          Remove
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Fulfillment Type Selector ──────────────────────────────────────────────

interface FulfillmentSelectorProps {
  selected: 'DELIVERY' | 'PICKUP';
  onSelect: (type: 'DELIVERY' | 'PICKUP') => void;
}

function FulfillmentSelector({ selected, onSelect }: FulfillmentSelectorProps) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
      {(['PICKUP', 'DELIVERY'] as const).map((type) => {
        const isSelected = selected === type;
        return (
          <Pressable
            key={type}
            onPress={() => onSelect(type)}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: isSelected ? '#2563eb' : '#e5e7eb',
              backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
              marginRight: type === 'PICKUP' ? 10 : 0,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 22, marginBottom: 4 }}>
              {type === 'PICKUP' ? '🚗' : '📦'}
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: isSelected ? '#2563eb' : '#374151',
              } as TextStyle}
            >
              {type === 'PICKUP' ? 'Curbside Pickup' : 'Delivery'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Timeslot Selector ──────────────────────────────────────────────────────

interface TimeslotSelectorProps {
  slots: FulfillmentSlot[];
  selectedSlotId: string | null;
  onSelect: (slot: FulfillmentSlot) => void;
}

function TimeslotSelector({ slots, selectedSlotId, onSelect }: TimeslotSelectorProps) {
  if (slots.length === 0) {
    return (
      <View style={{ paddingVertical: 12 }}>
        <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center' } as TextStyle}>
          No timeslots available
        </Text>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 } as TextStyle}>
        Select a Time Slot
      </Text>
      <FlatList
        data={slots.filter((s) => s.isAvailable)}
        keyExtractor={(item) => item.slotId}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const isSelected = selectedSlotId === item.slotId;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={{
                borderWidth: 2,
                borderColor: isSelected ? '#2563eb' : '#e5e7eb',
                borderRadius: 12,
                padding: 12,
                marginRight: 10,
                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                minWidth: 120,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isSelected ? '#2563eb' : '#111827',
                } as TextStyle}
              >
                {item.formattedDate}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 } as TextStyle}>
                {item.formattedStartTime} – {item.formattedEndTime}
              </Text>
              {item.fee > 0 && (
                <Text style={{ fontSize: 12, color: '#059669', marginTop: 4 } as TextStyle}>
                  +${item.fee.toFixed(2)} fee
                </Text>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HEBCartScreen({
  familyId,
  cartId,
  store,
  onOrderSubmitted,
  onBack,
  style,
}: HEBCartScreenProps) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fulfillment state
  const [fulfillmentType, setFulfillmentType] = useState<'DELIVERY' | 'PICKUP'>('PICKUP');
  const [slots, setSlots] = useState<FulfillmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<FulfillmentSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // ── Load cart ────────────────────────────────────────────────────────────

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const { getCart } = await import('@mealme/api');
      const result = await getCart(cartId, familyId, { storeId: store.id });
      setCart(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [cartId, familyId, store.id]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // ── Load fulfillment slots ───────────────────────────────────────────────

  const loadSlots = useCallback(async () => {
    setSlotsLoading(true);
    try {
      const { getFulfillmentSlots } = await import('@mealme/api');
      const deliveryAddress = fulfillmentType === 'DELIVERY'
        ? {
            address1: '',
            city: '',
            state: '',
            postalCode: store.address.zip,
          }
        : undefined;
      const result = await getFulfillmentSlots(
        familyId,
        fulfillmentType,
        deliveryAddress,
        { storeId: store.id },
      );
      setSlots(result);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [familyId, fulfillmentType, store.id, store.address.zip]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // ── Remove item ─────────────────────────────────────────────────────────

  const handleRemoveItem = useCallback(
    async (productId: string) => {
      try {
        const { removeCartItem } = await import('@mealme/api');
        await removeCartItem(cartId, productId, familyId, { storeId: store.id });
        await loadCart(); // Refresh
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to remove item');
      }
    },
    [cartId, familyId, store.id, loadCart],
  );

  // ── Submit order ────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!selectedSlot) {
      setError('Please select a fulfillment timeslot');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { submitOrder } = await import('@mealme/api');
      const deliveryDetails = {
        address: {
          address1: '',
          city: '',
          state: '',
          postalCode: store.address.zip,
        },
        fulfillmentType,
        slotId: selectedSlot.slotId,
        slotDate: selectedSlot.date,
        storeId: store.id,
      };

      const order = await submitOrder(cartId, familyId, deliveryDetails, {
        storeId: store.id,
      });

      onOrderSubmitted({
        orderId: order.orderId,
        status: (order.status ?? 'UNKNOWN') as OrderStatusInfo['status'],
        fulfillmentType: order.fulfillmentType,
        placedAt: order.placedAt,
        timeslot: order.timeslot,
        store: order.store,
        itemCount: order.items.length,
        total: order.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setSubmitting(false);
    }
  }, [selectedSlot, cartId, familyId, fulfillmentType, store, onOrderSubmitted]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }, style]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16 } as TextStyle}>
          Loading your cart...
        </Text>
      </View>
    );
  }

  const hasItems = cart && cart.items.length > 0;

  return (
    <View style={[{ flex: 1, backgroundColor: '#f9fafb' }, style]}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {onBack && (
            <Pressable onPress={onBack} style={{ marginRight: 12 }}>
              <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '500' } as TextStyle}>
                ← Back
              </Text>
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#111827' } as TextStyle}>
              HEB Cart
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 2 } as TextStyle}>
              {store.name}
            </Text>
          </View>
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderWidth: 1,
              borderColor: '#fecaca',
              borderRadius: 10,
              padding: 12,
            }}
          >
            <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
          </View>
        </View>
      )}

      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item, index) => `${item.productId}-${index}`}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16 }}
        renderItem={({ item }) => (
          <CartItemRow item={item} onRemove={handleRemoveItem} />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
            <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' } as TextStyle}>
              Your cart is empty
            </Text>
          </View>
        }
        ListFooterComponent={
          hasItems ? (
            <View style={{ paddingTop: 16 }}>
              {/* Fulfillment Type */}
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10 } as TextStyle}>
                Fulfillment Method
              </Text>
              <FulfillmentSelector
                selected={fulfillmentType}
                onSelect={setFulfillmentType}
              />

              {/* Timeslots */}
              {slotsLoading ? (
                <ActivityIndicator size="small" color="#2563eb" style={{ marginBottom: 16 }} />
              ) : (
                <TimeslotSelector
                  slots={slots}
                  selectedSlotId={selectedSlot?.slotId ?? null}
                  onSelect={setSelectedSlot}
                />
              )}

              {/* Order Summary */}
              <View
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 } as TextStyle}>
                  Order Summary
                </Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, color: '#6b7280' } as TextStyle}>
                    Subtotal ({cart!.itemCount} item{cart!.itemCount !== 1 ? 's' : ''})
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' } as TextStyle}>
                    {cart!.subtotal.formatted}
                  </Text>
                </View>

                {cart!.tax && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: '#6b7280' } as TextStyle}>Tax</Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' } as TextStyle}>
                      {cart!.tax.formatted}
                    </Text>
                  </View>
                )}

                {cart!.savings && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, color: '#059669' } as TextStyle}>Savings</Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#059669' } as TextStyle}>
                      -{cart!.savings.formatted}
                    </Text>
                  </View>
                )}

                {cart!.fees.map((fee) => (
                  <View
                    key={fee.id}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}
                  >
                    <Text style={{ fontSize: 14, color: '#6b7280' } as TextStyle}>{fee.displayName}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' } as TextStyle}>
                      {fee.amount.formatted}
                    </Text>
                  </View>
                ))}

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: '#e5e7eb',
                    paddingTop: 10,
                    marginTop: 4,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' } as TextStyle}>Total</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' } as TextStyle}>
                    {cart!.total.formatted}
                  </Text>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitting || !selectedSlot}
                style={{
                  backgroundColor: selectedSlot && !submitting ? '#2563eb' : '#d1d5db',
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                    Place Order
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default HEBCartScreen;
