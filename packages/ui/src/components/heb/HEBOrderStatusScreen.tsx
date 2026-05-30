/**
 * HEBOrderStatusScreen — Order tracking with status updates
 *
 * Displays the current order status, timeline of status changes,
 * order details (items, timeslot, store), and order history.
 * Supports pull-to-refresh for real-time status updates.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

import type { StoreInfo, OrderStatusInfo, OrderStatusValue } from '@mealme/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HEBOrderStatusScreenProps {
  /** Family ID for auth context. */
  familyId: string;
  /** HEB order ID to track. */
  orderId: string;
  /** Selected HEB store info. */
  store: StoreInfo;
  /** Called when the user goes back. */
  onBack?: () => void;
  /** Called when the user wants to view another order. */
  onViewOrderHistory?: () => void;
  /** Container style. */
  style?: ViewStyle;
}

// ─── Status Config ───────────────────────────────────────────────────────────

interface StatusStep {
  key: OrderStatusValue;
  label: string;
  icon: string;
}

const STATUS_STEPS: StatusStep[] = [
  { key: 'RESERVED', label: 'Reserved', icon: '📋' },
  { key: 'PENDING', label: 'Pending', icon: '⏳' },
  { key: 'IN_PROGRESS', label: 'In Progress', icon: '🛒' },
  { key: 'SHOPPING', label: 'Shopping', icon: '🛍️' },
  { key: 'CHECKED_OUT', label: 'Checked Out', icon: '✅' },
  { key: 'ON_THE_WAY', label: 'On the Way', icon: '🚗' },
  { key: 'DELIVERED', label: 'Delivered', icon: '📦' },
  { key: 'PICKED_UP', label: 'Picked Up', icon: '🎉' },
];

const STATUS_ORDER: OrderStatusValue[] = [
  'RESERVED',
  'PENDING',
  'IN_PROGRESS',
  'SHOPPING',
  'CHECKED_OUT',
  'ON_THE_WAY',
  'DELIVERED',
  'PICKED_UP',
];

function getStatusIndex(status: OrderStatusValue): number {
  const idx = STATUS_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function getStatusColor(status: OrderStatusValue): string {
  if (status === 'CANCELLED' || status === 'RESERVATION_FAILED') return '#dc2626';
  if (status === 'DELIVERED' || status === 'PICKED_UP') return '#059669';
  if (status === 'UNKNOWN') return '#9ca3af';
  return '#2563eb';
}

// ─── Status Timeline ────────────────────────────────────────────────────────

interface StatusTimelineProps {
  currentStatus: OrderStatusValue;
}

function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = getStatusIndex(currentStatus);
  const isCancelled = currentStatus === 'CANCELLED' || currentStatus === 'RESERVATION_FAILED';
  const isComplete = currentStatus === 'DELIVERED' || currentStatus === 'PICKED_UP';

  return (
    <View style={{ paddingVertical: 8 }}>
      {STATUS_STEPS.map((step, index) => {
        const isCompleted = !isCancelled && !isComplete && index <= currentIndex;
        const isCurrent = !isCancelled && step.key === currentStatus;

        // For completed orders, all steps are green
        const stepCompleted = isComplete || isCompleted;
        const stepColor = isCancelled
          ? index === 0
            ? '#dc2626'
            : '#d1d5db'
          : stepCompleted
            ? '#059669'
            : '#d1d5db';

        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            {/* Dot and line */}
            <View style={{ alignItems: 'center', marginRight: 12 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: stepCompleted ? stepColor : '#f3f4f6',
                  borderWidth: 2,
                  borderColor: stepColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14 }}>
                  {stepCompleted ? step.icon : '○'}
                </Text>
              </View>
              {index < STATUS_STEPS.length - 1 && (
                <View
                  style={{
                    width: 2,
                    height: 24,
                    backgroundColor: stepCompleted ? stepColor : '#e5e7eb',
                  }}
                />
              )}
            </View>

            {/* Label */}
            <View style={{ paddingBottom: index < STATUS_STEPS.length - 1 ? 8 : 0, paddingTop: 3 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: isCurrent ? '600' : '400',
                  color: isCurrent ? '#111827' : stepCompleted ? '#374151' : '#9ca3af',
                } as TextStyle}
              >
                {step.label}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Cancelled / Failed overlay */}
      {isCancelled && (
        <View
          style={{
            marginTop: 8,
            backgroundColor: '#fef2f2',
            borderWidth: 1,
            borderColor: '#fecaca',
            borderRadius: 10,
            padding: 12,
          }}
        >
          <Text style={{ color: '#dc2626', fontSize: 14, fontWeight: '600' } as TextStyle}>
            {currentStatus === 'CANCELLED' ? '❌ Order Cancelled' : '❌ Reservation Failed'}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Order Detail Card ──────────────────────────────────────────────────────

interface OrderDetailCardProps {
  order: OrderStatusInfo;
}

function OrderDetailCard({ order }: OrderDetailCardProps) {
  return (
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
      {/* Order ID */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
        <Text style={{ fontSize: 13, color: '#6b7280' } as TextStyle}>Order ID</Text>
        <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' } as TextStyle}>
          #{order.orderId.slice(0, 8)}
        </Text>
      </View>

      {/* Fulfillment type */}
      {order.fulfillmentType && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#6b7280' } as TextStyle}>Fulfillment</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' } as TextStyle}>
            {order.fulfillmentType === 'DELIVERY' ? '📦 Delivery' : '🚗 Curbside Pickup'}
          </Text>
        </View>
      )}

      {/* Timeslot */}
      {order.timeslot && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#6b7280' } as TextStyle}>Time Slot</Text>
          <View style={{ alignItems: 'flex-end' }}>
            {order.timeslot.formattedDate && (
              <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' } as TextStyle}>
                {order.timeslot.formattedDate}
              </Text>
            )}
            {order.timeslot.formattedStartTime && order.timeslot.formattedEndTime && (
              <Text style={{ fontSize: 12, color: '#6b7280' } as TextStyle}>
                {order.timeslot.formattedStartTime} – {order.timeslot.formattedEndTime}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Store */}
      {order.store && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#6b7280' } as TextStyle}>Store</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' } as TextStyle}>
            {order.store.name ?? 'HEB'}
          </Text>
        </View>
      )}

      {/* Item count */}
      {order.itemCount !== undefined && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 13, color: '#6b7280' } as TextStyle}>Items</Text>
          <Text style={{ fontSize: 13, fontWeight: '500', color: '#111827' } as TextStyle}>
            {order.itemCount}
          </Text>
        </View>
      )}

      {/* Total */}
      {order.total && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: '#e5e7eb',
            paddingTop: 10,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' } as TextStyle}>Total</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' } as TextStyle}>
            {order.total.formatted}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function HEBOrderStatusScreen({
  familyId,
  orderId,
  store,
  onBack,
  onViewOrderHistory,
  style,
}: HEBOrderStatusScreenProps) {
  const [order, setOrder] = useState<OrderStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load order status ────────────────────────────────────────────────────

  const loadOrder = useCallback(async () => {
    try {
      const { getOrderStatus } = await import('@mealme/api/dist/heb/hebService');
      const result = await getOrderStatus(orderId, familyId, { storeId: store.id });
      setOrder(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, familyId, store.id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  // ── Pull to refresh ─────────────────────────────────────────────────────

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrder();
  }, [loadOrder]);

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[{ flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' }, style]}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 16 } as TextStyle}>
          Loading order status...
        </Text>
      </View>
    );
  }

  const statusColor = order ? getStatusColor(order.status) : '#9ca3af';

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
              Order Status
            </Text>
          </View>
          {onViewOrderHistory && (
            <Pressable onPress={onViewOrderHistory}>
              <Text style={{ color: '#2563eb', fontSize: 14, fontWeight: '500' } as TextStyle}>
                History
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />
        }
      >
        {/* Error */}
        {error && (
          <View
            style={{
              backgroundColor: '#fef2f2',
              borderWidth: 1,
              borderColor: '#fecaca',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#dc2626', fontSize: 14 }}>{error}</Text>
          </View>
        )}

        {order && (
          <>
            {/* Status Badge */}
            <View
              style={{
                backgroundColor: `${statusColor}15`,
                borderWidth: 1,
                borderColor: `${statusColor}40`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 36, marginBottom: 8 }}>
                {order.status === 'DELIVERED' || order.status === 'PICKED_UP'
                  ? '🎉'
                  : order.status === 'CANCELLED'
                    ? '❌'
                    : order.status === 'ON_THE_WAY'
                      ? '🚗'
                      : order.status === 'SHOPPING'
                        ? '🛍️'
                        : '📋'}
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: statusColor,
                  textTransform: 'uppercase',
                } as TextStyle}
              >
                {order.status.replace(/_/g, ' ')}
              </Text>
              {order.placedAt && (
                <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 4 } as TextStyle}>
                  Placed {new Date(order.placedAt).toLocaleDateString()}
                </Text>
              )}
            </View>

            {/* Status Timeline */}
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
                Progress
              </Text>
              <StatusTimeline currentStatus={order.status} />
            </View>

            {/* Order Details */}
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 } as TextStyle}>
              Order Details
            </Text>
            <OrderDetailCard order={order} />

            {/* Refresh hint */}
            <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 } as TextStyle}>
              Pull down to refresh status
            </Text>
          </>
        )}

        {!order && !error && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
            <Text style={{ fontSize: 16, color: '#6b7280', textAlign: 'center' } as TextStyle}>
              No order information available
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default HEBOrderStatusScreen;
