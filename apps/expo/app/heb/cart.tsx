/**
 * HEB Cart Screen Route
 *
 * Shows the HEB cart with items, totals, delivery/pickup options,
 * and order submission.
 */

import { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HEBCartScreen } from '@mealme/ui';
import type { StoreInfo, OrderStatusInfo } from '@mealme/api';

export default function HEBCartRoute() {
  const router = useRouter();
  const { familyId, storeId, storeName, storeZip, shoppingListId } =
    useLocalSearchParams<{
      familyId: string;
      storeId: string;
      storeName: string;
      storeZip: string;
      shoppingListId: string;
    }>();

  const store: StoreInfo = {
    id: storeId ?? '',
    name: storeName ?? 'HEB',
    address: {
      street: '',
      city: '',
      state: '',
      zip: storeZip ?? '',
    },
  };

  const handleOrderSubmitted = useCallback(
    (order: OrderStatusInfo) => {
      // Navigate to order status screen
      router.push({
        pathname: '/heb/order-status',
        params: {
          familyId: familyId ?? '',
          orderId: order.orderId,
          storeId: store.id,
          storeName: store.name,
          storeZip: store.address.zip,
        },
      });
    },
    [familyId, store, router],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <HEBCartScreen
        familyId={familyId ?? ''}
        cartId={shoppingListId ?? ''}
        store={store}
        onOrderSubmitted={handleOrderSubmitted}
        onBack={handleBack}
      />
    </View>
  );
}
