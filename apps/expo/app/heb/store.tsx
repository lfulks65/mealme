/**
 * HEB Store Select Screen Route
 *
 * Entry point for the HEB grocery flow. Users enter a ZIP code
 * and select a store before proceeding to product matching.
 */

import { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HEBStoreSelectScreen } from '@mealme/ui';
import type { StoreInfo } from '@mealme/api';

export default function HEBStoreSelectRoute() {
  const router = useRouter();
  const { familyId } = useLocalSearchParams<{ familyId: string }>();
  const [, setSelectedStore] = useState<StoreInfo | null>(null);

  const handleStoreSelected = useCallback(
    (store: StoreInfo) => {
      setSelectedStore(store);
      // Navigate to product match screen
      router.push({
        pathname: '/heb/match',
        params: {
          familyId: familyId ?? '',
          storeId: store.id,
          storeName: store.name,
          storeZip: store.address.zip,
        },
      });
    },
    [familyId, router],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <HEBStoreSelectScreen
        familyId={familyId ?? ''}
        onStoreSelected={handleStoreSelected}
        onBack={handleBack}
      />
    </View>
  );
}
