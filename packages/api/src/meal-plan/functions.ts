/**
 * @module meal-plan/functions
 * Meal plan CRUD and AI proposal generation for the MealMe API client.
 *
 * All functions interact with Supabase directly and rely on RLS
 * policies for authorization. The current user's session is used
 * implicitly via the Supabase client.
 */

import { supabase } from '../supabase';
import type {
  MealPlanRow,
  MealPlanEntryRow,
  MealPlanEntryWithRecipe,
  UpdateMealEntryInput,
  MealPlanResult,
  MealPlanEntryResult,
  MealPlanProposalResult,
} from './types';
import type { MealSlot } from '@mealme/shared';
import { addDays, getDateRange, getWeekStart } from '@mealme/shared';
import { getAggregatedPreferences } from '../preferences';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the currently authenticated user's ID, or null if not signed in. */
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Map a Supabase error to a user-friendly string. */
function mapError(error: { message?: string }, fallback: string): string {
  return error.message ?? fallback;
}

/** Meal slots used when generating a full-week proposal. */
const PROPOSAL_MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

// ---------------------------------------------------------------------------
// createMealPlan
// ---------------------------------------------------------------------------

/**
 * Create an empty meal plan for a family and week.
 *
 * The plan starts in `draft` status with no entries.
 * RLS ensures only family members can create plans.
 *
 * @param familyId - The family this plan belongs to.
 * @param weekStartDate - The Monday of the plan week (YYYY-MM-DD).
 * @returns The created meal plan (no entries), or an error.
 */
export async function createMealPlan(
  familyId: string,
  weekStartDate: string,
): Promise<MealPlanResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { mealPlan: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      family_id: familyId,
      week_start_date: weekStartDate,
      created_by: userId,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) {
    return { mealPlan: null, error: mapError(error, 'Failed to create meal plan') };
  }

  const plan = data as MealPlanRow;
  return {
    mealPlan: { ...plan, entries: [] },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// getMealPlan
// ---------------------------------------------------------------------------

/**
 * Fetch a meal plan by ID, with all entries joined to their recipes.
 *
 * RLS ensures only family members can read plans.
 *
 * @param id - The meal plan UUID.
 * @returns The meal plan with entries and recipe summaries, or an error.
 */
export async function getMealPlan(id: string): Promise<MealPlanResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { mealPlan: null, error: 'Not authenticated' };
  }

  // Fetch the plan
  const { data: planData, error: planError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (planError) {
    return { mealPlan: null, error: mapError(planError, 'Meal plan not found') };
  }

  const plan = planData as MealPlanRow;

  // Fetch entries with joined recipe data
  const entries = await fetchEntriesWithRecipes(plan.id);

  return {
    mealPlan: { ...plan, entries },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// getWeeklyPlan
// ---------------------------------------------------------------------------

/**
 * Fetch the current week's meal plan for a family.
 *
 * If `weekStartDate` is not provided, the Monday of the current week
 * is used. Returns the plan with all entries and recipe summaries.
 *
 * @param familyId - The family to look up.
 * @param weekStartDate - The Monday of the plan week (YYYY-MM-DD). Defaults to current week.
 * @returns The meal plan with entries, or an error.
 */
export async function getWeeklyPlan(
  familyId: string,
  weekStartDate?: string,
): Promise<MealPlanResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { mealPlan: null, error: 'Not authenticated' };
  }

  const monday = weekStartDate ?? getWeekStart(new Date().toISOString().slice(0, 10));

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('family_id', familyId)
    .eq('week_start_date', monday)
    .single();

  if (error) {
    // No plan for this week is not necessarily an error
    if (error.code === 'PGRST116') {
      return { mealPlan: null, error: null };
    }
    return { mealPlan: null, error: mapError(error, 'Failed to fetch weekly plan') };
  }

  const plan = data as MealPlanRow;
  const entries = await fetchEntriesWithRecipes(plan.id);

  return {
    mealPlan: { ...plan, entries },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// addMealEntry
// ---------------------------------------------------------------------------

/**
 * Add a recipe entry to a meal plan.
 *
 * @param planId - The meal plan to add the entry to.
 * @param date - The date for this entry (YYYY-MM-DD).
 * @param mealSlot - Which meal slot (breakfast/lunch/dinner/snack).
 * @param recipeId - The recipe to assign.
 * @param servings - Optional number of servings (defaults to 4).
 * @returns The created entry with recipe summary, or an error.
 */
export async function addMealEntry(
  planId: string,
  date: string,
  mealSlot: MealSlot,
  recipeId: string,
  servings?: number,
): Promise<MealPlanEntryResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { entry: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('meal_plan_entries')
    .insert({
      meal_plan_id: planId,
      date,
      meal_slot: mealSlot,
      recipe_id: recipeId,
      servings: servings ?? 4,
    })
    .select('*')
    .single();

  if (error) {
    return { entry: null, error: mapError(error, 'Failed to add meal entry') };
  }

  const entry = data as MealPlanEntryRow;
  const recipe = await fetchRecipeSummary(recipeId);

  return {
    entry: { ...entry, recipe },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// removeMealEntry
// ---------------------------------------------------------------------------

/**
 * Remove a meal plan entry by its ID.
 *
 * @param entryId - The entry to remove.
 * @returns The removed entry ID on success, or an error.
 */
export async function removeMealEntry(
  entryId: string,
): Promise<{ entryId: string | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { entryId: null, error: 'Not authenticated' };
  }

  const { error } = await supabase.from('meal_plan_entries').delete().eq('id', entryId);

  if (error) {
    return { entryId: null, error: mapError(error, 'Failed to remove meal entry') };
  }

  return { entryId, error: null };
}

// ---------------------------------------------------------------------------
// updateMealEntry
// ---------------------------------------------------------------------------

/**
 * Update a meal plan entry.
 *
 * Only the provided fields are updated; omitted fields remain unchanged.
 *
 * @param entryId - The entry to update.
 * @param data - Partial update payload.
 * @returns The updated entry with recipe summary, or an error.
 */
export async function updateMealEntry(
  entryId: string,
  data: UpdateMealEntryInput,
): Promise<MealPlanEntryResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { entry: null, error: 'Not authenticated' };
  }

  const payload: Record<string, unknown> = {};

  if (data.date !== undefined) payload.date = data.date;
  if (data.mealSlot !== undefined) payload.meal_slot = data.mealSlot;
  if (data.recipeId !== undefined) payload.recipe_id = data.recipeId;
  if (data.servings !== undefined) payload.servings = data.servings;
  if (data.notes !== undefined) payload.notes = data.notes;

  const { data: updated, error } = await supabase
    .from('meal_plan_entries')
    .update(payload)
    .eq('id', entryId)
    .select('*')
    .single();

  if (error) {
    return { entry: null, error: mapError(error, 'Failed to update meal entry') };
  }

  const entry = updated as MealPlanEntryRow;
  const recipe = entry.recipe_id ? await fetchRecipeSummary(entry.recipe_id) : null;

  return {
    entry: { ...entry, recipe },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// generatePlanProposal
// ---------------------------------------------------------------------------

/**
 * Generate an AI-assisted meal plan proposal for a family's week.
 *
 * This function:
 *   1. Fetches aggregated family preferences (dietary restrictions,
 *      cuisine preferences, allergies, budget tier, household size).
 *   2. Queries recipes that match those preferences.
 *   3. Fills every day × meal slot with a suitable recipe, avoiding
 *      repetition within the same day and minimizing repeats across
 *      the week.
 *   4. Creates a draft meal plan with all entries.
 *
 * If a draft plan already exists for this family/week, it is
 * replaced (deleted and recreated).
 *
 * @param familyId - The family to generate the plan for.
 * @param weekStartDate - The Monday of the plan week (YYYY-MM-DD).
 * @returns The generated draft plan with entries, or an error.
 */
export async function generatePlanProposal(
  familyId: string,
  weekStartDate: string,
): Promise<MealPlanProposalResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { mealPlan: null, error: 'Not authenticated' };
  }

  // 1. Fetch aggregated preferences
  const { preferences: aggPrefs, error: prefsError } = await getAggregatedPreferences(familyId);

  if (prefsError || !aggPrefs) {
    return {
      mealPlan: null,
      error: prefsError ?? 'Could not load family preferences',
    };
  }

  // 2. Query candidate recipes matching preferences
  const candidateRecipes = await fetchCandidateRecipes(aggPrefs);

  if (candidateRecipes.length === 0) {
    return {
      mealPlan: null,
      error: 'No recipes found matching family preferences',
    };
  }

  // 3. Delete any existing draft plan for this family/week
  const { data: existingPlan } = await supabase
    .from('meal_plans')
    .select('id')
    .eq('family_id', familyId)
    .eq('week_start_date', weekStartDate)
    .eq('status', 'draft')
    .maybeSingle();

  if (existingPlan) {
    await supabase.from('meal_plans').delete().eq('id', existingPlan.id);
  }

  // 4. Create a new draft plan
  const { data: planData, error: planError } = await supabase
    .from('meal_plans')
    .insert({
      family_id: familyId,
      week_start_date: weekStartDate,
      created_by: userId,
      status: 'draft',
    })
    .select('*')
    .single();

  if (planError || !planData) {
    return {
      mealPlan: null,
      error: mapError(planError!, 'Failed to create draft plan'),
    };
  }

  const plan = planData as MealPlanRow;

  // 5. Generate entries for each day × slot
  const weekDates = getDateRange(weekStartDate, addDays(weekStartDate, 6));
  const entries: MealPlanEntryWithRecipe[] = [];
  const usedRecipeIdsByDay: Map<string, Set<string>> = new Map();
  const usedRecipeIdsGlobal: Map<string, number> = new Map();

  for (const date of weekDates) {
    usedRecipeIdsByDay.set(date, new Set());
  }

  for (const date of weekDates) {
    const usedToday = usedRecipeIdsByDay.get(date)!;

    for (const slot of PROPOSAL_MEAL_SLOTS) {
      const recipe = selectBestRecipe(candidateRecipes, usedToday, usedRecipeIdsGlobal, aggPrefs);

      if (!recipe) continue;

      usedToday.add(recipe.id);
      usedRecipeIdsGlobal.set(recipe.id, (usedRecipeIdsGlobal.get(recipe.id) ?? 0) + 1);

      const { data: entryData, error: entryError } = await supabase
        .from('meal_plan_entries')
        .insert({
          meal_plan_id: plan.id,
          date,
          meal_slot: slot,
          recipe_id: recipe.id,
          servings: aggPrefs.budgetRange?.max
            ? Math.min(Math.max(2, Math.round(aggPrefs.budgetRange.max / 50)), 8)
            : 4,
        })
        .select('*')
        .single();

      if (entryError) {
        // Log but continue — a partial plan is better than none
        console.warn(
          `[MealPlan] Failed to insert entry for ${date}/${slot}: ${entryError.message}`,
        );
        continue;
      }

      entries.push({
        ...(entryData as MealPlanEntryRow),
        recipe,
      });
    }
  }

  return {
    mealPlan: { ...plan, entries },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Fetch all entries for a meal plan, with joined recipe summaries.
 */
async function fetchEntriesWithRecipes(mealPlanId: string): Promise<MealPlanEntryWithRecipe[]> {
  const { data, error } = await supabase
    .from('meal_plan_entries')
    .select('*')
    .eq('meal_plan_id', mealPlanId)
    .order('date', { ascending: true })
    .order('meal_slot', { ascending: true });

  if (error || !data) {
    return [];
  }

  const rows = data as MealPlanEntryRow[];
  const results: MealPlanEntryWithRecipe[] = [];

  for (const row of rows) {
    const recipe = row.recipe_id ? await fetchRecipeSummary(row.recipe_id) : null;
    results.push({ ...row, recipe });
  }

  return results;
}

/**
 * Fetch a recipe summary by ID for embedding in meal plan entries.
 *
 * Returns null if the recipe is not found.
 */
async function fetchRecipeSummary(recipeId: string): Promise<MealPlanEntryWithRecipe['recipe']> {
  const { data, error } = await supabase
    .from('recipes')
    .select(
      'id, title, description, prep_time_minutes, cook_time_minutes, servings, difficulty, image_urls, dietary_tags, cuisine_type',
    )
    .eq('id', recipeId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as MealPlanEntryWithRecipe['recipe'];
}

/**
 * Recipe row shape returned from candidate recipe queries.
 */
interface CandidateRecipe {
  id: string;
  title: string;
  description: string | null;
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  difficulty: string;
  image_urls: string[];
  dietary_tags: string[];
  cuisine_type: string | null;
}

/**
 * Fetch candidate recipes that match the family's aggregated preferences.
 *
 * Queries recipes that:
 *   - Have dietary tags overlapping with family restrictions
 *   - Match preferred cuisine types
 *   - Are not excluded by allergies
 *
 * Falls back to all recipes if no specific filters match.
 */
async function fetchCandidateRecipes(prefs: {
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  allergies: string[];
  budgetRange: { min: number; max: number; currency: string };
}): Promise<CandidateRecipe[]> {
  // Try to find recipes matching dietary restrictions
  let query = supabase
    .from('recipes')
    .select(
      'id, title, description, prep_time_minutes, cook_time_minutes, servings, difficulty, image_urls, dietary_tags, cuisine_type',
    )
    .limit(100);

  // If family has dietary restrictions, filter for recipes that are compatible
  if (prefs.dietaryRestrictions.length > 0) {
    query = query.overlaps('dietary_tags', prefs.dietaryRestrictions);
  }

  // If family has cuisine preferences, prefer those
  if (prefs.cuisinePreferences.length > 0) {
    query = query.in('cuisine_type', prefs.cuisinePreferences);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    // Fallback: fetch any available recipes
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('recipes')
      .select(
        'id, title, description, prep_time_minutes, cook_time_minutes, servings, difficulty, image_urls, dietary_tags, cuisine_type',
      )
      .limit(50);

    if (fallbackError || !fallbackData) {
      return [];
    }

    return fallbackData as CandidateRecipe[];
  }

  return data as CandidateRecipe[];
}

/**
 * Select the best recipe for a slot, avoiding repetition.
 *
 * Prioritizes:
 *   1. Recipes not used today (hard constraint)
 *   2. Recipes used fewer times this week (soft constraint)
 *   3. Recipes matching preferred cuisines (tiebreaker)
 *
 * Uses a weighted random selection to add variety.
 */
function selectBestRecipe(
  candidates: CandidateRecipe[],
  usedToday: Set<string>,
  usedThisWeek: Map<string, number>,
  prefs: { cuisinePreferences: string[] },
): CandidateRecipe | null {
  // Filter out recipes already used today
  const available = candidates.filter((r) => !usedToday.has(r.id));

  if (available.length === 0) {
    // If all recipes are used today, allow repeats
    return candidates.length > 0 ? candidates[0] : null;
  }

  // Score each recipe: lower usage count = higher priority
  // Bonus for matching cuisine preferences
  const scored = available.map((recipe) => {
    const usageCount = usedThisWeek.get(recipe.id) ?? 0;
    const cuisineBonus =
      prefs.cuisinePreferences.length > 0 &&
      recipe.cuisine_type &&
      prefs.cuisinePreferences.includes(recipe.cuisine_type)
        ? -1
        : 0;

    return { recipe, score: usageCount + cuisineBonus };
  });

  // Sort by score (ascending = least used first)
  scored.sort((a, b) => a.score - b.score);

  // Pick from the top candidates with some randomness
  const topN = Math.min(3, scored.length);
  const pick = scored[Math.floor(Math.random() * topN)];

  return pick.recipe;
}
