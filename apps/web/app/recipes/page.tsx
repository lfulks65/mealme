/**
 * @module RecipesPage
 * Server Component for browsing recipes.
 *
 * Fetches popular recipes and categories server-side.
 * Uses generateMetadata for SEO-friendly page titles.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { getPopularRecipes, getRecipeCategories } from '@/lib/recipe';
import { RecipeGrid } from '@/components/recipe/RecipeGrid';

export const metadata: Metadata = {
  title: 'Recipes — MealMe',
  description:
    'Browse and discover delicious recipes. Filter by cuisine, dietary needs, and more.',
};

export default async function RecipesPage() {
  const [recipesResult, categoriesResult] = await Promise.all([
    getPopularRecipes(12),
    getRecipeCategories(),
  ]);

  const recipes = recipesResult.recipes;
  const categories = categoriesResult.categories;
  const hasError = recipesResult.error || categoriesResult.error;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
        <p className="mt-2 text-lg text-gray-600">
          Discover delicious recipes for every meal and occasion.
        </p>
      </div>

      {/* Error banner */}
      {hasError && (
        <div className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-700">
            Some data could not be loaded. Please try refreshing the page.
          </p>
        </div>
      )}

      {/* Cuisine categories */}
      {categories.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            Browse by Cuisine
          </h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.cuisine}
                href={`/recipes/search?cuisine=${encodeURIComponent(category.cuisine)}`}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                <span className="capitalize">{category.cuisine}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                  {category.count}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Search link */}
      <div className="mb-8">
        <Link
          href="/recipes/search"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          Search Recipes
        </Link>
      </div>

      {/* Popular recipes grid */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Popular Recipes
        </h2>
        <RecipeGrid
          recipes={recipes}
          emptyMessage="No recipes available yet. Check back soon!"
        />
      </div>
    </div>
  );
}
