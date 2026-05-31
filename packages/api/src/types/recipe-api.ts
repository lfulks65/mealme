/**
 * @module types/recipe-api
 *
 * Recipe API request/response types.
 *
 * Extends the base domain types from `@mealme/shared` with
 * API-specific request/response wrappers for recipe CRUD and
 * search/recommendation endpoints.
 */

import type {
  Recipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeSearchFilters,
  RecipeSearchParams,
  RecipeSearchResult,
  RecipeRecommendation,
} from '@mealme/shared';

import type { PaginatedResponse, PaginationParams, SortOptions } from './api';

// ---------------------------------------------------------------------------
// List recipes
// ---------------------------------------------------------------------------

/** Request parameters for listing recipes. */
export interface ListRecipesRequest extends PaginationParams {
  /** Sort options. */
  sort?: SortOptions;
  /** Filter criteria. */
  filters?: RecipeSearchFilters;
}

/** Paginated response of recipes. */
export type ListRecipesResponse = PaginatedResponse<Recipe>;

// ---------------------------------------------------------------------------
// Get recipe
// ---------------------------------------------------------------------------

/** Response for a single recipe. */
export type GetRecipeResponse = Recipe;

// ---------------------------------------------------------------------------
// Create recipe
// ---------------------------------------------------------------------------

/** Request body for creating a recipe. */
export type CreateRecipeRequest = CreateRecipeInput;

/** Response for a created recipe. */
export type CreateRecipeResponse = Recipe;

// ---------------------------------------------------------------------------
// Update recipe
// ---------------------------------------------------------------------------

/** Request body for updating a recipe. */
export type UpdateRecipeRequest = UpdateRecipeInput;

/** Response for an updated recipe. */
export type UpdateRecipeResponse = Recipe;

// ---------------------------------------------------------------------------
// Delete recipe
// ---------------------------------------------------------------------------

/** Response for a deleted recipe. */
export type DeleteRecipeResponse = { success: boolean };

// ---------------------------------------------------------------------------
// Search recipes
// ---------------------------------------------------------------------------

/** Request parameters for searching recipes. */
export type SearchRecipesRequest = RecipeSearchParams;

/** Response for recipe search results. */
export type SearchRecipesResponse = RecipeSearchResult[];

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

/** Request parameters for recipe recommendations. */
export interface GetRecommendationsRequest {
  /** The family to generate recommendations for. */
  familyId: string;
  /** Maximum number of recommendations to return. */
  count?: number;
}

/** Response for recipe recommendations. */
export type GetRecommendationsResponse = RecipeRecommendation[];
