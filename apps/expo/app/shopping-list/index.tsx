/**
 * Shopping List screen route.
 *
 * Displays the categorized shopping list with check-off toggles,
 * swipe-to-delete, quantity editing, and FAB to add custom items.
 */
import { View, StyleSheet } from 'react-native';
import { ShoppingListScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function ShoppingListRoute() {
  const router = useRouter();
  const { listId, listName, mealPlanRef } = useLocalSearchParams<{
    listId?: string;
    listName?: string;
    mealPlanRef?: string;
  }>();

  return (
    <View style={styles.container}>
      <ShoppingListScreen
        listId={listId ?? 'demo-list'}
        listName={listName}
        mealPlanRef={mealPlanRef}
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
