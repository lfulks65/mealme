/**
 * Meal Prep screen route.
 *
 * Step-by-step cooking view for a recipe with timer support,
 * ingredient sidebar, and step navigation.
 */
import { View, StyleSheet } from 'react-native';
import { MealPrepScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MealPrepRoute() {
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{
    recipeId?: string;
  }>();

  return (
    <View style={styles.container}>
      <MealPrepScreen
        recipeId={recipeId ?? 'demo-recipe'}
        onBack={() => router.back()}
        onComplete={() => {
          // Could navigate to a completion screen or back
          router.back();
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
