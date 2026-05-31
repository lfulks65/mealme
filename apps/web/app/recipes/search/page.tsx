/**
 * @module RecipeSearchPage
 * Server Component for searching recipes.
 *
 * Reads search params from the URL and fetches matching recipes
 * server-side for SSR. Passes results to client component for
 * interactive search/filter features.
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { searchRecipes, getRecipeCategories } from '@/lib/recipe';
import type { RecipeFull, RecipeDietaryInfo } from '@mealme/shared';
import { RecipeGrid } from '@/components/recipe/RecipeGrid';
import { RecipeSearchClient } from '@/components/recipe/RecipeSearchClient';

interface RecipeSearchPageProps {
  searchParams: {
    q?: string;
    cuisine?: string;
    dietary?: string;
  };
}

export function generateMetadata({ searchParams }: RecipeSearchPageProps): Metadata {
  const query = searchParams.q ?? '';
  const cuisine = searchParams.cuisine ?? '';

  const title = query
    ? `Search: "${query}" — MealMe Recipes`
    : cuisine
      ? `${cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} Recipes — MealMe`
      : 'Search Recipes — MealMe';

  return {
    title,
    description: query
      ? `Search results for "${query}" on MealMe. Find recipes matching your search.`
      : 'Search and filter recipes by name, cuisine, and dietary restrictions.',
  };
}

export default async function RecipeSearchPage({ searchParams }: RecipeSearchPageProps) {
  const query = searchParams.q ?? '';
  const cuisine = searchParams.cuisine ?? '';
  const dietaryParams = searchParams.dietary?.split(',').filter(Boolean) ?? [];

  // Fetch search results and categories in parallel
  const [searchResult, categoriesResult] = await Promise.all([
    searchRecipes(
      query || undefined,
      {
        ...(cuisine ? { cuisine } : {}),
        ...(dietaryParams.length > 0
          ? { dietary_restrictions: dietaryParams }
          : {}),
      },
      20,
      0,
    ),
    getRecipeCategories(),
  ]);

  const recipes = searchResult.recipes;
  const total = searchResult.total;
  const categories = categoriesResult.categories;
  const availableCuisines = categories.map((c) => c.cuisine);

  // Collect unique dietary restrictions from results for filter options
  const dietarySet = new Set<string>();
  recipes.forEach((recipe: RecipeFull) => {
    recipe.dietary_info.forEach((di: RecipeDietaryInfo) => {
      if (di.is_compliant) dietarySet.add(di.restriction);
    });
  });
  const availableDietary = Array.from(dietarySet).sort();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Search Recipes</h1>
        <p className="mt-2 text-lg text-gray-600">
          Find the perfect recipe for any occasion.
        </p>
      </div>

      {/* Search & filters */}
      <Suspense fallback={null}>
        <RecipeSearchClient
          availableCuisines={availableCuisines}
          availableDietaryRestrictions={availableDietary}
        />
      </Suspense>

      {/* Results info */}
      <div className="mt-6 mb-4">
        {query && (
          <p className="text-sm text-gray-500">
            {total} result{total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
            {cuisine && (
              <span> in {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)}</span>
            )}
          </p>
        )}
        {!query && cuisine && (
          <p className="text-sm text-gray-500">
            {total} {cuisine.charAt(0).toUpperCase() + cuisine.slice(1)} recipe{total !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Error */}
      {searchResult.error && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-700">{searchResult.error}</p>
        </div>
      )}

      {/* Results grid */}
      <RecipeGrid
        recipes={recipes}
        emptyMessage={
          query
            ? `No recipes found for "${query}". Try a different search term.`
            : 'No recipes found. Try adjusting your filters.'
        }
      />
    </div>
  );
}
