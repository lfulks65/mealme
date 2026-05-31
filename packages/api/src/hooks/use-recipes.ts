/**
 * @module hooks/use-recipes
 * React Query hooks for recipe domain functions.
 *
 * Wraps search, get, and recommendation functions with
 * caching, loading states, and automatic refetching.
 */

import { useQuery } from '@tanstack/react-query';
import {
  searchRecipes,
  getRecipe,
} from '../recipe/search';
import { recommendRecipes } from '../recipe/recommend';
import type {
  RecipeSearchFilters,
  RecipeSearchParams,
  RecipeSearchResult,
  RecipeFull,
  RecipeRecommendation,
} from '@mealme/shared';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: RecipeSearchFilters | undefined, page: number) =>
    [...recipeKeys.lists(), filters, page] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
  search: (params: RecipeSearchParams) =>
    [...recipeKeys.all, 'search', params] as const,
  recommendations: (familyId: string, count?: number) =>
    [...recipeKeys.all, 'recommendations', familyId, count] as const,
  preferences: (filters: RecipeSearchFilters | undefined, page: number) =>
    [...recipeKeys.all, 'preferences', filters, page] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of recipes with optional filters.
 *
 * @param filters - Optional search filters (cuisine, tags, dietary, etc.)
 * @param page - Page number (0-indexed). Defaults to 0.
 */
export function useRecipes(
  filters?: RecipeSearchFilters,
  page: number = 0,
) {
  const limit = 20;
  const offset = page * limit;

  return useQuery<RecipeSearchResult>({
    queryKey: recipeKeys.list(filters, page),
    queryFn: () => searchRecipes(undefined, filters, limit, offset),
  });
}

/**
 * Fetch a single recipe by ID with all nested relations.
 *
 * @param id - The recipe UUID. Query is disabled when id is falsy.
 */
export function useRecipe(id: string | undefined) {
  return useQuery<RecipeFull | null>({
    queryKey: recipeKeys.detail(id ?? ''),
    queryFn: () => getRecipe(id!),
    enabled: !!id,
  });
}

/**
 * Search recipes with full-text search and optional filters.
 *
 * @param params - Search parameters including query string and filters.
 */
export function useRecipeSearch(params: RecipeSearchParams) {
  return useQuery<RecipeSearchResult>({
    queryKey: recipeKeys.search(params),
    queryFn: () =>
      searchRecipes(params.query, params.filters, params.limit, params.offset),
  });
}

/**
 * Get recipe recommendations for a family based on their preferences.
 *
 * @param familyId - The family to get recommendations for.
 * @param count - Number of recommendations to return. Defaults to 10.
 */
export function useRecipeRecommendations(
  familyId: string | undefined,
  count: number = 10,
) {
  return useQuery<RecipeRecommendation[]>({
    queryKey: recipeKeys.recommendations(familyId ?? '', count),
    queryFn: () => recommendRecipes(familyId!, count),
    enabled: !!familyId,
  });
}
