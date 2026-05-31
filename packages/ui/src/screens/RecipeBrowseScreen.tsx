import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import type { RecipeFull, RecipeCategory } from '@mealme/shared';
import { Carousel, type CarouselItem } from '../synapsis/Carousel';
import { ProductCard } from '../synapsis/ProductCard';
import {
  useRecipeCategories,
  useRecipeRecommendations,
  useQuickMeals,
  useCategoryRecipes,
} from '../hooks/useRecipeApi';

// ── Category Card ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: RecipeCategory;
  onPress: (cuisine: string) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => (
  <Pressable
    style={styles.categoryCard}
    onPress={() => onPress(category.cuisine)}
    accessibilityRole="button"
    accessibilityLabel={`${category.cuisine} cuisine, ${category.count} recipes`}
  >
    <View style={styles.categoryIconContainer}>
      <Text style={styles.categoryIcon}>{getCuisineEmoji(category.cuisine)}</Text>
    </View>
    <Text style={styles.categoryName} numberOfLines={1}>
      {category.cuisine}
    </Text>
    <Text style={styles.categoryCount}>{category.count} recipes</Text>
  </Pressable>
);

function getCuisineEmoji(cuisine: string): string {
  const map: Record<string, string> = {
    Mediterranean: '🫒',
    Italian: '🍕',
    Thai: '🍜',
    Japanese: '🍣',
    Mexican: '🌮',
    American: '🍔',
    Indian: '🍛',
    Korean: '🥘',
  };
  return map[cuisine] ?? '🍽️';
}

// ── Recipe to CarouselItem converter ──────────────────────────────────────────

function recipeToCarouselItems(
  recipes: RecipeFull[],
  onRecipePress?: (recipeId: string) => void,
): CarouselItem[] {
  return recipes.map((recipe) => {
    const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
    const badge = recipe.tags.find((t) => t.tag === 'quick')?.tag;
    return {
      id: recipe.id,
      element: (
        <ProductCard
          id={recipe.id}
          title={recipe.title}
          subtitle={recipe.cuisine ?? undefined}
          imageUrl={recipe.image_url}
          badge={badge ? 'Quick' : undefined}
          metadata={`${totalTime} min · ${recipe.calories ?? '—'} cal`}
          onPress={() => onRecipePress?.(recipe.id)}
        />
      ),
    };
  });
}

// ── RecipeBrowseScreen ────────────────────────────────────────────────────────

export interface RecipeBrowseScreenProps {
  /** Navigate to recipe detail */
  onRecipePress?: (recipeId: string) => void;
  /** Navigate back */
  onBack?: () => void;
}

export const RecipeBrowseScreen: React.FC<RecipeBrowseScreenProps> = ({
  onRecipePress,
  onBack,
}) => {
  const { categories, loading: categoriesLoading } = useRecipeCategories();
  const { recommendations, loading: recsLoading } = useRecipeRecommendations();
  const { recipes: quickMeals, loading: quickLoading } = useQuickMeals();

  // Per-category recipes — we'll use a simple approach that loads all categories
  // In production, this would be paginated/lazy-loaded per carousel
  const mediterraneanRecipes = useCategoryRecipes('Mediterranean');
  const italianRecipes = useCategoryRecipes('Italian');
  const thaiRecipes = useCategoryRecipes('Thai');

  if (categoriesLoading && recsLoading && quickLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading recipes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={8} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : null}
        <Text style={styles.headerTitle}>Browse Recipes</Text>
      </View>

      {/* Recommended for You Carousel */}
      {recommendations.length > 0 ? (
        <Carousel
          title="✨ Recommended for You"
          onSeeAll={() => {}}
          items={recipeToCarouselItems(
            recommendations.map((r) => r.recipe),
            onRecipePress,
          )}
        />
      ) : null}

      {/* Quick Meals Carousel */}
      {quickMeals.length > 0 ? (
        <Carousel
          title="⚡ Quick Meals"
          onSeeAll={() => {}}
          items={recipeToCarouselItems(quickMeals, onRecipePress)}
        />
      ) : null}

      {/* Cuisine Category Carousels */}
      {mediterraneanRecipes.recipes.length > 0 ? (
        <Carousel
          title="🫒 Mediterranean"
          onSeeAll={() => {}}
          items={recipeToCarouselItems(mediterraneanRecipes.recipes, onRecipePress)}
        />
      ) : null}

      {italianRecipes.recipes.length > 0 ? (
        <Carousel
          title="🍕 Italian"
          onSeeAll={() => {}}
          items={recipeToCarouselItems(italianRecipes.recipes, onRecipePress)}
        />
      ) : null}

      {thaiRecipes.recipes.length > 0 ? (
        <Carousel
          title="🍜 Thai"
          onSeeAll={() => {}}
          items={recipeToCarouselItems(thaiRecipes.recipes, onRecipePress)}
        />
      ) : null}

      {/* All Categories Grid */}
      <View style={styles.categoriesSection}>
        <Text style={styles.categoriesTitle}>🌍 All Cuisines</Text>
        <View style={styles.categoriesDivider} />
        <FlatList
          data={categories}
          keyExtractor={(item) => item.cuisine}
          renderItem={({ item }) => (
            <CategoryCard category={item} onPress={() => onRecipePress?.(item.cuisine)} />
          )}
          numColumns={2}
          columnWrapperStyle={styles.categoryRow}
          scrollEnabled={false}
          contentContainerStyle={styles.categoryGrid}
        />
      </View>

      {/* Bottom Spacer */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  backButton: {
    marginRight: 12,
  },
  backText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 40,
  },
  categoriesDivider: {
    backgroundColor: '#FF6B35',
    borderRadius: 1,
    height: 2,
    marginBottom: 12,
    marginTop: 4,
    width: 40,
  },
  categoriesSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  categoriesTitle: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '700',
  },
  categoryCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E5E5',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
    width: '48%',
  },
  categoryCount: {
    color: '#999999',
    fontSize: 12,
    marginTop: 2,
  },
  categoryGrid: {
    paddingBottom: 8,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryIconContainer: {
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginBottom: 8,
    width: 48,
  },
  categoryName: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryRow: {
    justifyContent: 'space-between',
  },
  container: {
    backgroundColor: '#FAFAFA',
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerTitle: {
    color: '#1A1A1A',
    fontSize: 24,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    flex: 1,
    justifyContent: 'center',
  },
  loadingText: {
    color: '#666666',
    fontSize: 14,
    marginTop: 8,
  },
});
