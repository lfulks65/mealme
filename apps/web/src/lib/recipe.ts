/**
 * @module recipe (server)
 * Server-side recipe data fetching for Next.js App Router.
 *
 * These functions use the cookie-based Supabase server client
 * to fetch recipe data in Server Components. They mirror
 * the client-side API functions from @mealme/api but work
 * without React hooks or client-side auth context.
 */

import { createServerClient } from './supabase-server';
import type {
  RecipeFull,
  RecipeIngredientDB,
  RecipeInstruction,
  RecipeTag,
  RecipeDietaryInfo,
  RecipeSearchFilters,
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
function groupBy<T extends Record<string, unknown>>(
  items: T[],
  key: string,
): Record<string, T[]> {
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
async function attachRelations(
  recipes: RecipeFull[],
): Promise<RecipeFull[]> {
  if (recipes.length === 0) return recipes;

  const supabase = createServerClient();
  const recipeIds = recipes.map((r) => r.id);

  const [ingredients, instructions, tags, dietaryInfo] = await Promise.all([
    supabase.from('recipe_ingredients').select('*').in('recipe_id', recipeIds),
    supabase
      .from('recipe_instructions')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('step_number', { ascending: true }),
    supabase.from('recipe_tags').select('*').in('recipe_id', recipeIds),
    supabase.from('recipe_dietary_info').select('*').in('recipe_id', recipeIds),
  ]);

  if (ingredients.error) throw ingredients.error;
  if (instructions.error) throw instructions.error;
  if (tags.error) throw tags.error;
  if (dietaryInfo.error) throw dietaryInfo.error;

  const ingredientMap = groupBy<RecipeIngredientDB>(
    ingredients.data as RecipeIngredientDB[],
    'recipe_id',
  );
  const instructionMap = groupBy<RecipeInstruction>(
    instructions.data as RecipeInstruction[],
    'recipe_id',
  );
  const tagMap = groupBy<RecipeTag>(tags.data as RecipeTag[], 'recipe_id');
  const dietaryMap = groupBy<RecipeDietaryInfo>(
    dietaryInfo.data as RecipeDietaryInfo[],
    'recipe_id',
  );

  return recipes.map((r) => ({
    ...r,
    ingredients: ingredientMap[r.id] ?? [],
    instructions: instructionMap[r.id] ?? [],
    tags: tagMap[r.id] ?? [],
    dietary_info: dietaryMap[r.id] ?? [],
  }));
}

/**
 * Build a Supabase query with filter chain from RecipeSearchFilters.
 */
function applyFilters(query: any, filters: RecipeSearchFilters) {
  if (filters.cuisine) {
    query = query.eq('cuisine', filters.cuisine);
  }
  if (filters.max_prep_minutes !== undefined) {
    query = query.lte('prep_minutes', filters.max_prep_minutes);
  }
  if (filters.max_cook_minutes !== undefined) {
    query = query.lte('cook_minutes', filters.max_cook_minutes);
  }
  if (filters.max_calories !== undefined) {
    query = query.lte('calories', filters.max_calories);
  }
  if (filters.min_servings !== undefined) {
    query = query.gte('servings', filters.min_servings);
  }
  return query;
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
export async function getRecipe(
  id: string,
): Promise<ServerRecipeResult> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single();

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
 *
 * @param query - Search query string.
 * @param filters - Optional structured filters.
 * @param limit - Max results to return.
 * @param offset - Pagination offset.
 * @returns Search results with total count, or an error.
 */
export async function searchRecipes(
  query?: string,
  filters?: RecipeSearchFilters,
  limit = 20,
  offset = 0,
): Promise<ServerRecipeListResult> {
  const supabase = createServerClient();

  let q: any = supabase.from('recipes').select('*', { count: 'exact' });

  // Full-text search using the generated `fts` column
  if (query && query.trim().length > 0) {
    const tsQuery = query
      .trim()
      .split(/\s+/)
      .map((w) => w + ':*')
      .join(' & ');
    q = q.textSearch('fts', tsQuery, {
      type: 'plain',
      config: 'english',
    });
  }

  // Apply structured filters
  if (filters) {
    q = applyFilters(q, filters);
  }

  // Pagination
  q = q
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  const { data, error, count } = await q;

  if (error) {
    return { recipes: [], total: 0, error: mapError(error, 'Search failed') };
  }

  const recipes = (data ?? []) as RecipeFull[];

  try {
    let withRelations = await attachRelations(recipes);

    // If dietary restriction filters are specified, further filter in-memory
    if (filters?.dietary_restrictions && filters.dietary_restrictions.length > 0) {
      withRelations = withRelations.filter((recipe: RecipeFull) =>
        filters.dietary_restrictions!.every((restriction: string) =>
          recipe.dietary_info.some(
            (di: RecipeDietaryInfo) => di.restriction === restriction && di.is_compliant,
          ),
        ),
      );
    }

    // If tag filters are specified, further filter in-memory
    if (filters?.tags && filters.tags.length > 0) {
      withRelations = withRelations.filter((recipe: RecipeFull) =>
        filters.tags!.every((tag: string) =>
          recipe.tags.some((t: RecipeTag) => t.tag.toLowerCase() === tag.toLowerCase()),
        ),
      );
    }

    return {
      recipes: withRelations,
      total: count ?? withRelations.length,
      error: null,
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
export async function getPopularRecipes(
  limit = 12,
): Promise<ServerRecipeListResult> {
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
export async function getPopularRecipeIds(
  limit = 20,
): Promise<string[]> {
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
