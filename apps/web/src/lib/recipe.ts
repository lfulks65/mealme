/**
 * @module recipe (server)
 * Server-side recipe data fetching for Next.js App Router.
 *
 * These functions use the cookie-based Supabase server client
 * to fetch recipe data in Server Components. They mirror
 * the client-side API functions from @mealme/api but work
 * without React hooks or client-side auth context.
 *
 * Also exports a client-side `searchRecipesClient` that uses
 * the @mealme/api package for use in React Query hooks.
 */

import { createServerClient } from './supabase-server';
import { searchRecipes as searchRecipesApi } from '@mealme/api';
import type {
  RecipeFull,
  RecipeIngredientDB,
  RecipeStepDB,
  RecipeTag,
  RecipeDietaryInfo,
  RecipeSearchFilters,
  RecipeSearchResult,
  RecipeCategory,
} from '@mealme/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result wrapper for server-side recipe queries. */
export interface ServerRecipeResult {
  recipe: RecipeFull | null;
  error: string | null;
}

/** Result wrapper for server-side recipe list queries. */
export interface ServerRecipeListResult {
  recipes: RecipeFull[];
  total: number;
  error: string | null;
  has_more?: boolean;
}

/** Result wrapper for server-side category queries. */
export interface ServerCategoryResult {
  categories: RecipeCategory[];
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Supabase error to a user-friendly string. */
function mapError(error: { message?: string }, fallback: string): string {
  return error.message ?? fallback;
}

/**
 * Group an array of objects by a key.
 */
function groupBy<T>(items: T[], key: string & keyof T): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = item[key] as string;
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

/**
 * Fetch all nested relations for a set of recipe IDs and attach them.
 * This avoids N+1 queries by batching the lookups.
 */
async function attachRelations(recipes: RecipeFull[]): Promise<RecipeFull[]> {
  if (recipes.length === 0) return recipes;

  const supabase = createServerClient();
  const recipeIds = recipes.map((r) => r.id);

  const [ingredients, steps, tags, dietaryInfo] = await Promise.all([
    supabase.from('recipe_ingredients').select('*').in('recipe_id', recipeIds),
    supabase
      .from('recipe_steps')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('step_number', { ascending: true }),
    supabase.from('recipe_tags').select('*').in('recipe_id', recipeIds),
    supabase.from('recipe_dietary_info').select('*').in('recipe_id', recipeIds),
  ]);

  if (ingredients.error) throw ingredients.error;
  if (steps.error) throw steps.error;
  if (tags.error) throw tags.error;
  if (dietaryInfo.error) throw dietaryInfo.error;

  const ingredientMap = groupBy<RecipeIngredientDB>(
    ingredients.data as RecipeIngredientDB[],
    'recipe_id',
  );
  const stepMap = groupBy<RecipeStepDB>(steps.data as RecipeStepDB[], 'recipe_id');
  const tagMap = groupBy<RecipeTag>(tags.data as RecipeTag[], 'recipe_id');
  const dietaryMap = groupBy<RecipeDietaryInfo>(
    dietaryInfo.data as RecipeDietaryInfo[],
    'recipe_id',
  );

  return recipes.map((r) => ({
    ...r,
    ingredients: ingredientMap[r.id] ?? [],
    steps: stepMap[r.id] ?? [],
    tags: tagMap[r.id] ?? [],
    dietary_info: dietaryMap[r.id] ?? [],
  }));
}

// ---------------------------------------------------------------------------
// getRecipe
// ---------------------------------------------------------------------------

/**
 * Fetch a single recipe by ID with all nested relations.
 *
 * @param id - The recipe UUID.
 * @returns The recipe with relations, or an error.
 */
export async function getRecipe(id: string): Promise<ServerRecipeResult> {
  const supabase = createServerClient();

  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).single();

  if (error) {
    if (error.code === 'PGRST116') {
      return { recipe: null, error: null };
    }
    return { recipe: null, error: mapError(error, 'Failed to fetch recipe') };
  }

  if (!data) {
    return { recipe: null, error: null };
  }

  try {
    const [withRelations] = await attachRelations([data as RecipeFull]);
    return { recipe: withRelations, error: null };
  } catch (err) {
    return {
      recipe: null,
      error: err instanceof Error ? err.message : 'Failed to load recipe details',
    };
  }
}

// ---------------------------------------------------------------------------
// searchRecipes
// ---------------------------------------------------------------------------

/**
 * Full-text search across recipes with optional filters, server-side.
 * Uses the `search_recipes_rpc` Supabase RPC for server-side
 * filtering, sorting, and pagination.
 *
 * @param filters - Search filters including query, cuisine, difficulty, etc.
 * @returns Search results with total count and has_more, or an error.
 */
export async function searchRecipes(
  filters: RecipeSearchFilters = {},
): Promise<ServerRecipeListResult> {
  const supabase = createServerClient();

  const { data, error } = await supabase.rpc('search_recipes_rpc', {
    p_query: filters.query || null,
    p_cuisine: filters.cuisine || null,
    p_difficulty: filters.difficulty || null,
    p_dietary_restrictions: filters.dietary_restrictions ?? [],
    p_max_prep_minutes: filters.max_prep_minutes ?? null,
    p_max_total_minutes: filters.max_total_minutes ?? null,
    p_max_calories: filters.max_calories ?? null,
    p_tags: filters.tags ?? [],
    p_sort: filters.sort ?? 'relevance',
    p_limit: filters.limit ?? 20,
    p_offset: filters.offset ?? 0,
  });

  if (error) {
    return { recipes: [], total: 0, error: mapError(error, 'Search failed') };
  }

  const recipes = (data ?? []) as RecipeFull[];
  const total = recipes.length > 0 ? (recipes[0] as any).total_count : 0;

  try {
    const withRelations = await attachRelations(recipes);

    return {
      recipes: withRelations,
      total,
      error: null,
      has_more: (filters.offset ?? 0) + (filters.limit ?? 20) < total,
    };
  } catch (err) {
    return {
      recipes: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Failed to load search results',
    };
  }
}

// ---------------------------------------------------------------------------
// getPopularRecipes
// ---------------------------------------------------------------------------

/**
 * Fetch popular / recently created recipes for the browse page.
 *
 * @param limit - Max results to return.
 * @returns List of recipes with relations, or an error.
 */
export async function getPopularRecipes(limit = 12): Promise<ServerRecipeListResult> {
  const supabase = createServerClient();

  const { data, error, count } = await supabase
    .from('recipes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { recipes: [], total: 0, error: mapError(error, 'Failed to fetch recipes') };
  }

  const recipes = (data ?? []) as RecipeFull[];

  try {
    const withRelations = await attachRelations(recipes);
    return {
      recipes: withRelations,
      total: count ?? withRelations.length,
      error: null,
    };
  } catch (err) {
    return {
      recipes: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Failed to load recipes',
    };
  }
}

// ---------------------------------------------------------------------------
// getRecipesByCuisine
// ---------------------------------------------------------------------------

/**
 * Fetch recipes filtered by cuisine type.
 *
 * @param cuisine - The cuisine type string (e.g., "italian", "mexican").
 * @param limit - Max results to return.
 * @param offset - Pagination offset.
 * @returns Filtered recipes with relations, or an error.
 */
export async function getRecipesByCuisine(
  cuisine: string,
  limit = 20,
  offset = 0,
): Promise<ServerRecipeListResult> {
  const supabase = createServerClient();

  const { data, error, count } = await supabase
    .from('recipes')
    .select('*', { count: 'exact' })
    .ilike('cuisine', cuisine)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) {
    return { recipes: [], total: 0, error: mapError(error, 'Failed to fetch recipes by cuisine') };
  }

  const recipes = (data ?? []) as RecipeFull[];

  try {
    const withRelations = await attachRelations(recipes);
    return {
      recipes: withRelations,
      total: count ?? withRelations.length,
      error: null,
      has_more: offset + limit < (count ?? withRelations.length),
    };
  } catch (err) {
    return {
      recipes: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Failed to load recipes',
    };
  }
}

// ---------------------------------------------------------------------------
// getRecipeCategories
// ---------------------------------------------------------------------------

/**
 * Get all available cuisine categories with recipe counts.
 *
 * @returns Array of categories with counts, or an error.
 */
export async function getRecipeCategories(): Promise<ServerCategoryResult> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('recipes')
    .select('cuisine')
    .not('cuisine', 'is', null);

  if (error) {
    return { categories: [], error: mapError(error, 'Failed to fetch categories') };
  }

  // Aggregate counts in-memory
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const c = row.cuisine;
    if (c) {
      counts[c] = (counts[c] ?? 0) + 1;
    }
  }

  const categories = Object.entries(counts)
    .map(([cuisine, count]) => ({ cuisine, count }))
    .sort((a, b) => b.count - a.count);

  return { categories, error: null };
}

// ---------------------------------------------------------------------------
// getPopularRecipeIds (for generateStaticParams)
// ---------------------------------------------------------------------------

/**
 * Get IDs of popular recipes for static generation.
 *
 * Used by generateStaticParams to pre-render popular recipe detail pages.
 *
 * @param limit - Max IDs to return.
 * @returns Array of recipe IDs.
 */
export async function getPopularRecipeIds(limit = 20): Promise<string[]> {
  // Skip Supabase queries when env vars are missing (e.g. at build time)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    return [];
  }

  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('recipes')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data.map((row: { id: string }) => row.id);
}

// ---------------------------------------------------------------------------
// searchRecipesClient (client-side)
// ---------------------------------------------------------------------------

/**
 * Client-side recipe search using the @mealme/api package.
 *
 * This function delegates to the @mealme/api searchRecipes,
 * which uses the Supabase client (anon key) for client-side
 * data fetching. Used by React Query hooks in the web app.
 *
 * @param filters - Search filters including query, cuisine, difficulty, etc.
 * @returns Search results with total count and has_more.
 */
export async function searchRecipesClient(
  filters: RecipeSearchFilters = {},
): Promise<RecipeSearchResult> {
  return searchRecipesApi(filters);
}
