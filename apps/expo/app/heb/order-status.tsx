/**
 * HEB Order Status Screen Route
 *
 * Displays order tracking with status updates and timeline.
 */

import { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HEBOrderStatusScreen } from '@mealme/ui';
import type { StoreInfo } from '@mealme/api';

export default function HEBOrderStatusRoute() {
  const router = useRouter();
  const { familyId, orderId, storeId, storeName, storeZip } =
    useLocalSearchParams<{
      familyId: string;
      orderId: string;
      storeId: string;
      storeName: string;
      storeZip: string;
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

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleViewHistory = useCallback(() => {
    // Could navigate to order history screen in the future
    router.back();
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <HEBOrderStatusScreen
        familyId={familyId ?? ''}
        orderId={orderId ?? ''}
        store={store}
        onBack={handleBack}
        onViewOrderHistory={handleViewHistory}
      />
    </View>
  );
}
