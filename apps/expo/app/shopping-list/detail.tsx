/**
 * Shopping List Detail screen route.
 *
 * Full list view with progress indicator (% checked off),
 * categorized items, and check-off functionality.
 */
import { View, StyleSheet } from 'react-native';
import { ShoppingListDetailScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ShoppingListDetailRoute() {
  const router = useRouter();
  const { listId, listName, mealPlanRef } = useLocalSearchParams<{
    listId?: string;
    listName?: string;
    mealPlanRef?: string;
  }>();

  return (
    <View style={styles.container}>
      <ShoppingListDetailScreen
        listId={listId ?? 'demo-list'}
        listName={listName}
        mealPlanRef={mealPlanRef}
        onBack={() => router.back()}
        onRecipePress={(recipeId: string) => {
          router.push({
            pathname: '/meal-prep',
            params: { recipeId },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
