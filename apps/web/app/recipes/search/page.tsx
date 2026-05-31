/**
 * @module RecipeSearchPage
 * Server Component for searching recipes.
 *
 * Simplified: reads URL params for SEO metadata, renders the
 * client component which handles all data fetching with React Query.
 */

import { Metadata } from 'next';
import { Suspense } from 'react';
import { RecipeSearchClient } from '@/components/recipe/RecipeSearchClient';

interface RecipeSearchPageProps {
  searchParams: {
    q?: string;
    cuisine?: string;
    difficulty?: string;
    dietary?: string;
    sort?: string;
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
      : 'Search and filter recipes by name, cuisine, difficulty, and dietary restrictions.',
  };
}

export default function RecipeSearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Search Recipes</h1>
        <p className="mt-2 text-lg text-gray-600">Find the perfect recipe for any occasion.</p>
      </div>

      {/* Search & filters (client-side with React Query) */}
      <Suspense fallback={null}>
        <RecipeSearchClient />
      </Suspense>
    </div>
  );
}
