import { getSupabaseClient } from '../lib/supabase';
import type { RecipeNutrition, RecipeWithNutrition, RecipeFull } from '@mealme/shared';

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get nutrition data for a single recipe.
 *
 * Returns `null` if the recipe has no nutrition row.
 */
export async function getRecipeNutrition(recipeId: string): Promise<RecipeNutrition | null> {
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('recipe_nutrition')
    .select('*')
    .eq('recipe_id', recipeId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }

  return data as RecipeNutrition | null;
}

/** Filters for nutrition-range queries. */
export interface NutritionRangeFilters {
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
}

/**
 * Find recipes whose nutrition falls within the specified ranges.
 *
 * Joins `recipe_nutrition` with `recipes` so each result includes
 * the full recipe plus its nutrition row.  Recipes without a
 * nutrition row are excluded.
 */
export async function getRecipesByNutritionRange(
  filters: NutritionRangeFilters,
  limit = 20,
  offset = 0,
): Promise<RecipeWithNutrition[]> {
  const sb = getSupabaseClient();

  // Build the query on recipe_nutrition with range filters
  let q: any = sb.from('recipe_nutrition').select('*, recipes(*)').not('recipe_id', 'is', null);

  if (filters.minCalories !== undefined) {
    q = q.gte('calories', filters.minCalories);
  }
  if (filters.maxCalories !== undefined) {
    q = q.lte('calories', filters.maxCalories);
  }
  if (filters.minProtein !== undefined) {
    q = q.gte('protein_g', filters.minProtein);
  }
  if (filters.maxProtein !== undefined) {
    q = q.lte('protein_g', filters.maxProtein);
  }
  if (filters.minCarbs !== undefined) {
    q = q.gte('carbs_g', filters.minCarbs);
  }
  if (filters.maxCarbs !== undefined) {
    q = q.lte('carbs_g', filters.maxCarbs);
  }
  if (filters.minFat !== undefined) {
    q = q.gte('fat_g', filters.minFat);
  }
  if (filters.maxFat !== undefined) {
    q = q.lte('fat_g', filters.maxFat);
  }

  q = q.range(offset, offset + limit - 1).order('calories', { ascending: true });

  const { data, error } = await q;
  if (error) throw error;

  // Map joined rows to RecipeWithNutrition
  return (data ?? []).map((row: any) => {
    const { recipes, ...nutrition } = row;
    return {
      ...(recipes as RecipeFull),
      nutrition: nutrition as RecipeNutrition,
    } as RecipeWithNutrition;
  });
}
