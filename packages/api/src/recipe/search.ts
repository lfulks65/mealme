import { getSupabaseClient } from '../lib/supabase';
import { passesDietaryFilter, passesAllergenFilter, passesBudgetFilter } from './recommend';
import type {
  RecipeFull,
  RecipeIngredientDB,
  RecipeStepDB,
  RecipeTag,
  RecipeDietaryInfo,
  RecipeNutrition,
  RecipeSearchFilters,
  RecipeSearchResult,
  FamilyPreferences,
  RecipeCategory,
} from '@mealme/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetch all nested relations for a set of recipe IDs and attach them.
 * This avoids N+1 queries by batching the lookups.
 */
export async function attachRelations(recipes: RecipeFull[]): Promise<RecipeFull[]> {
  if (recipes.length === 0) return recipes;

  const sb = getSupabaseClient();
  const recipeIds = recipes.map((r) => r.id);

  const [ingredients, steps, tags, dietaryInfo, nutrition] = await Promise.all([
    sb.from('recipe_ingredients').select('*').in('recipe_id', recipeIds),
    sb
      .from('recipe_steps')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('step_number', { ascending: true }),
    sb.from('recipe_tags').select('*').in('recipe_id', recipeIds),
    sb.from('recipe_dietary_info').select('*').in('recipe_id', recipeIds),
    sb.from('recipe_nutrition').select('*').in('recipe_id', recipeIds),
  ]);

  if (ingredients.error) throw ingredients.error;
  if (steps.error) throw steps.error;
  if (tags.error) throw tags.error;
  if (dietaryInfo.error) throw dietaryInfo.error;
  if (nutrition.error) throw nutrition.error;

  const ingredientMap = groupBy<RecipeIngredientDB>(ingredients.data, 'recipe_id');
  const stepMap = groupBy<RecipeStepDB>(steps.data, 'recipe_id');
  const tagMap = groupBy<RecipeTag>(tags.data, 'recipe_id');
  const dietaryMap = groupBy<RecipeDietaryInfo>(dietaryInfo.data, 'recipe_id');
  const nutritionMap = groupBy<RecipeNutrition>(nutrition.data, 'recipe_id');

  return recipes.map((r) => ({
    ...r,
    ingredients: ingredientMap[r.id] ?? [],
    steps: stepMap[r.id] ?? [],
    tags: tagMap[r.id] ?? [],
    dietary_info: dietaryMap[r.id] ?? [],
    nutrition: nutritionMap[r.id]?.[0] ?? null,
  }));
}

function groupBy<T extends Record<string, any>>(items: T[], key: string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = item[key] as string;
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Full-text search across recipes with optional filters.
 * Uses the `search_recipes_rpc` Supabase RPC for server-side
 * filtering, sorting, and pagination.
 */
export async function searchRecipes(
  filters: RecipeSearchFilters = {},
): Promise<RecipeSearchResult> {
  const sb = getSupabaseClient();

  const { data, error } = await sb.rpc('search_recipes_rpc', {
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

  if (error) throw error;

  const recipes = (data ?? []) as RecipeFull[];
  const total = recipes.length > 0 ? (recipes[0] as any).total_count : 0;

  // Attach relations (ingredients, steps, tags, dietary_info)
  const withRelations = await attachRelations(recipes);

  return {
    recipes: withRelations,
    total,
    limit: filters.limit ?? 20,
    offset: filters.offset ?? 0,
    has_more: (filters.offset ?? 0) + (filters.limit ?? 20) < total,
  };
}

/**
 * Get a single recipe by ID with all nested relations.
 */
export async function getRecipe(id: string): Promise<RecipeFull | null> {
  const sb = getSupabaseClient();

  const { data, error } = await sb.from('recipes').select('*').eq('id', id).single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  if (!data) return null;

  const [withRelations] = await attachRelations([data as RecipeFull]);
  return withRelations;
}

/**
 * Filter recipes matching a family's dietary restrictions, allergies,
 * and cuisine preferences.
 */
export async function getRecipesByPreferences(
  preferences: FamilyPreferences,
  limit = 20,
  offset = 0,
): Promise<RecipeSearchResult> {
  const sb = getSupabaseClient();

  // Start with all recipes, optionally filtered by preferred cuisines
  let q: any = sb.from('recipes').select('*', { count: 'exact' });

  if (preferences.cuisinePreferences.length > 0) {
    q = q.in('cuisine', preferences.cuisinePreferences);
  }

  q = q.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await q;
  if (error) throw error;

  const recipes = (data ?? []) as RecipeFull[];
  let withRelations = await attachRelations(recipes);

  // Filter OUT recipes that conflict with dietary restrictions
  withRelations = withRelations.filter((recipe) =>
    passesDietaryFilter(recipe, preferences.dietaryRestrictions),
  );

  // Filter OUT recipes with allergens
  withRelations = withRelations.filter((recipe) =>
    passesAllergenFilter(recipe, preferences.allergies),
  );

  // Filter OUT recipes over budget
  withRelations = withRelations.filter((recipe) =>
    passesBudgetFilter(recipe, preferences.budgetRange),
  );

  const total = count ?? withRelations.length;

  return {
    recipes: withRelations,
    total,
    limit,
    offset,
    has_more: offset + limit < total,
  };
}

/**
 * List recipes by cuisine category.
 */
export async function listRecipesByCategory(
  category: string,
  limit = 20,
  offset = 0,
): Promise<RecipeSearchResult> {
  const sb = getSupabaseClient();

  const { data, error, count } = await sb
    .from('recipes')
    .select('*', { count: 'exact' })
    .ilike('cuisine', category)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const recipes = (data ?? []) as RecipeFull[];
  const withRelations = await attachRelations(recipes);
  const total = count ?? withRelations.length;

  return {
    recipes: withRelations,
    total,
    limit,
    offset,
    has_more: offset + limit < total,
  };
}

/**
 * Get all available cuisine categories with recipe counts.
 */
export async function listCategories(): Promise<RecipeCategory[]> {
  const sb = getSupabaseClient();

  const { data, error } = await sb.from('recipes').select('cuisine').not('cuisine', 'is', null);

  if (error) throw error;

  // Aggregate counts in-memory (Supabase doesn't support GROUP BY directly)
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const c = row.cuisine;
    if (c) {
      counts[c] = (counts[c] ?? 0) + 1;
    }
  }

  return Object.entries(counts)
    .map(([cuisine, count]) => ({ cuisine, count }))
    .sort((a, b) => b.count - a.count);
}
