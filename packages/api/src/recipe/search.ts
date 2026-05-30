import { getSupabaseClient } from '../lib/supabase';
import type {
  RecipeFull,
  RecipeIngredientDB,
  RecipeInstruction,
  RecipeTag,
  RecipeDietaryInfo,
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
export async function attachRelations(
  recipes: RecipeFull[]
): Promise<RecipeFull[]> {
  if (recipes.length === 0) return recipes;

  const sb = getSupabaseClient();
  const recipeIds = recipes.map((r) => r.id);

  const [ingredients, instructions, tags, dietaryInfo] = await Promise.all([
    sb.from('recipe_ingredients').select('*').in('recipe_id', recipeIds),
    sb
      .from('recipe_instructions')
      .select('*')
      .in('recipe_id', recipeIds)
      .order('step_number', { ascending: true }),
    sb.from('recipe_tags').select('*').in('recipe_id', recipeIds),
    sb.from('recipe_dietary_info').select('*').in('recipe_id', recipeIds),
  ]);

  if (ingredients.error) throw ingredients.error;
  if (instructions.error) throw instructions.error;
  if (tags.error) throw tags.error;
  if (dietaryInfo.error) throw dietaryInfo.error;

  const ingredientMap = groupBy<RecipeIngredientDB>(
    ingredients.data,
    'recipe_id'
  );
  const instructionMap = groupBy<RecipeInstruction>(
    instructions.data,
    'recipe_id'
  );
  const tagMap = groupBy<RecipeTag>(tags.data, 'recipe_id');
  const dietaryMap = groupBy<RecipeDietaryInfo>(
    dietaryInfo.data,
    'recipe_id'
  );

  return recipes.map((r) => ({
    ...r,
    ingredients: ingredientMap[r.id] ?? [],
    instructions: instructionMap[r.id] ?? [],
    tags: tagMap[r.id] ?? [],
    dietary_info: dietaryMap[r.id] ?? [],
  }));
}

function groupBy<T extends Record<string, any>>(
  items: T[],
  key: string
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const k = item[key] as string;
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

/**
 * Build a Supabase query with filter chain from RecipeSearchFilters.
 */
function applyFilters(
  query: any,
  filters: RecipeSearchFilters
) {
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

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Full-text search across recipes with optional filters.
 * Uses PostgreSQL tsvector `fts` column for efficient text search.
 */
export async function searchRecipes(
  query?: string,
  filters?: RecipeSearchFilters,
  limit = 20,
  offset = 0
): Promise<RecipeSearchResult> {
  const sb = getSupabaseClient();

  let q: any = sb.from('recipes').select('*', { count: 'exact' });

  // Full-text search using the generated `fts` column
  if (query && query.trim().length > 0) {
    // Convert user query to tsquery: split words, join with &
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
  q = q.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await q;
  if (error) throw error;

  const recipes = (data ?? []) as RecipeFull[];
  const withRelations = await attachRelations(recipes);

  // If dietary restriction filters are specified, further filter in-memory
  // since dietary_info is in a separate table
  let filtered = withRelations;
  if (filters?.dietary_restrictions && filters.dietary_restrictions.length > 0) {
    filtered = withRelations.filter((recipe) =>
      filters.dietary_restrictions!.every((restriction: string) =>
        recipe.dietary_info.some(
          (di) => di.restriction === restriction && di.is_compliant
        )
      )
    );
  }

  // If tag filters are specified, further filter in-memory
  if (filters?.tags && filters.tags.length > 0) {
    filtered = filtered.filter((recipe) =>
      filters.tags!.every((tag: string) =>
        recipe.tags.some((t) => t.tag.toLowerCase() === tag.toLowerCase())
      )
    );
  }

  return {
    recipes: filtered,
    total: count ?? filtered.length,
    limit,
    offset,
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
  offset = 0
): Promise<RecipeSearchResult> {
  const sb = getSupabaseClient();

  // Start with all recipes, optionally filtered by preferred cuisines
  let q: any = sb.from('recipes').select('*', { count: 'exact' });

  if (preferences.preferredCuisines.length > 0) {
    q = q.in('cuisine', preferences.preferredCuisines);
  }

  q = q.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await q;
  if (error) throw error;

  const recipes = (data ?? []) as RecipeFull[];
  let withRelations = await attachRelations(recipes);

  // Filter OUT recipes that conflict with dietary restrictions
  // A recipe is excluded if any required dietary restriction is NOT compliant
  if (preferences.dietaryRestrictions.length > 0) {
    withRelations = withRelations.filter((recipe) =>
      preferences.dietaryRestrictions.every((restriction: string) =>
        recipe.dietary_info.some(
          (di) => di.restriction === restriction && di.is_compliant
        )
      )
    );
  }

  // Filter OUT recipes with excluded ingredients (allergies + explicitly excluded)
  if (preferences.excludedIngredients.length > 0) {
    withRelations = withRelations.filter((recipe) => {
      const ingredientNames = recipe.ingredients.map((i) =>
        i.name.toLowerCase()
      );
      return preferences.excludedIngredients.every((excluded: string) =>
        ingredientNames.every(
          (name) => !name.includes(excluded.toLowerCase())
        )
      );
    });
  }

  return {
    recipes: withRelations,
    total: count ?? withRelations.length,
    limit,
    offset,
  };
}

/**
 * List recipes by cuisine category.
 */
export async function listRecipesByCategory(
  category: string,
  limit = 20,
  offset = 0
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

  return {
    recipes: withRelations,
    total: count ?? withRelations.length,
    limit,
    offset,
  };
}

/**
 * Get all available cuisine categories with recipe counts.
 */
export async function listCategories(): Promise<RecipeCategory[]> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('recipes')
    .select('cuisine')
    .not('cuisine', 'is', null);

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
