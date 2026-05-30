/**
 * HEB Product Match Screen Route
 *
 * Shows shopping list items matched to HEB products.
 * Users can swap matches, adjust quantities, and add to cart.
 */

import { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { HEBProductMatchScreen } from '@mealme/ui';
import type { StoreInfo, ProductMatch } from '@mealme/api';

export default function HEBProductMatchRoute() {
  const router = useRouter();
  const { familyId, shoppingListId, storeId, storeName, storeZip } =
    useLocalSearchParams<{
      familyId: string;
      shoppingListId: string;
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

  const handleAddToCart = useCallback(
    (_matches: ProductMatch[]) => {
      // Navigate to cart screen
      router.push({
        pathname: '/heb/cart',
        params: {
          familyId: familyId ?? '',
          storeId: store.id,
          storeName: store.name,
          storeZip: store.address.zip,
          shoppingListId: shoppingListId ?? '',
        },
      });
    },
    [familyId, shoppingListId, store, router],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <View style={{ flex: 1 }}>
      <HEBProductMatchScreen
        familyId={familyId ?? ''}
        shoppingListId={shoppingListId ?? ''}
        store={store}
        onAddToCart={handleAddToCart}
        onBack={handleBack}
      />
    </View>
  );
}
