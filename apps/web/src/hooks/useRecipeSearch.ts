/**
 * @module useRecipeSearch
 * React Query infinite scroll hook for recipe search.
 *
 * Uses `useInfiniteQuery` for cursor-based pagination with
 * IntersectionObserver-driven infinite scroll.
 */

'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchRecipesClient } from '@/lib/recipe';
import type { RecipeSortOption, RecipeDifficulty } from '@mealme/shared';

export interface UseRecipeSearchOptions {
  query?: string;
  cuisine?: string;
  difficulty?: RecipeDifficulty;
  dietary_restrictions?: string[];
  max_prep_minutes?: number;
  max_total_minutes?: number;
  max_calories?: number;
  tags?: string[];
  sort?: RecipeSortOption;
  pageSize?: number;
  enabled?: boolean;
}

export function useRecipeSearch(options: UseRecipeSearchOptions = {}) {
  const pageSize = options.pageSize ?? 20;

  return useInfiniteQuery({
    queryKey: ['recipeSearch', options],
    queryFn: ({ pageParam = 0 }) =>
      searchRecipesClient({
        query: options.query,
        cuisine: options.cuisine,
        difficulty: options.difficulty,
        dietary_restrictions: options.dietary_restrictions,
        max_prep_minutes: options.max_prep_minutes,
        max_total_minutes: options.max_total_minutes,
        max_calories: options.max_calories,
        tags: options.tags,
        sort: options.sort,
        limit: pageSize,
        offset: pageParam as number,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.offset + lastPage.limit : undefined,
    initialPageParam: 0,
    enabled: options.enabled !== false,
  });
}
