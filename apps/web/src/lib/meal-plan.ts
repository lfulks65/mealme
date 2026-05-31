/**
 * @module meal-plan (server)
 * Server-side meal plan data fetching for Next.js App Router.
 *
 * These functions use the cookie-based Supabase server client
 * to fetch meal plan data in Server Components. They mirror
 * the client-side API functions from @mealme/api but work
 * without React hooks or client-side auth context.
 */

import { createServerClient } from './supabase-server';
import type {
  MealPlanRow,
  MealPlanEntryRow,
  MealPlanEntryWithRecipe,
  MealPlanWithEntries,
} from '@mealme/api';
import { getWeekStart } from '@mealme/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Result wrapper for server-side meal plan queries. */
export interface ServerMealPlanResult {
  mealPlan: MealPlanWithEntries | null;
  error: string | null;
}

/** A single day's plan indicator for monthly view. */
export interface DayPlanIndicator {
  date: string;
  hasPlan: boolean;
  mealCount: number;
}

/** Result wrapper for monthly plan indicators. */
export interface ServerMonthlyPlanResult {
  days: DayPlanIndicator[];
  error: string | null;
}

/** Recipe summary shape for joined recipe data. */
interface RecipeSummary {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map a Supabase error to a user-friendly string. */
function mapError(error: { message?: string }, fallback: string): string {
  return error.message ?? fallback;
}

/**
 * Fetch all entries for a meal plan, with joined recipe summaries.
 */
async function fetchEntriesWithRecipes(
  mealPlanId: string,
): Promise<MealPlanEntryWithRecipe[]> {
  const supabase = createServerClient();

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
    const recipe = row.recipe_id
      ? await fetchRecipeSummary(row.recipe_id)
      : null;
    results.push({ ...row, recipe });
  }

  return results;
}

/**
 * Fetch a recipe summary by ID for embedding in meal plan entries.
 */
async function fetchRecipeSummary(
  recipeId: string,
): Promise<RecipeSummary | null> {
  const supabase = createServerClient();

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

  return data as RecipeSummary;
}

// ---------------------------------------------------------------------------
// getWeeklyMealPlan
// ---------------------------------------------------------------------------

/**
 * Fetch a weekly meal plan for a family, server-side.
 *
 * @param familyId - The family to look up.
 * @param weekStartDate - The Monday of the plan week (YYYY-MM-DD).
 * @returns The meal plan with entries, or an error.
 */
export async function getWeeklyMealPlan(
  familyId: string,
  weekStartDate: string,
): Promise<ServerMealPlanResult> {
  const supabase = createServerClient();

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
// getMonthlyMealPlan
// ---------------------------------------------------------------------------

/**
 * Fetch monthly plan indicators for a family, server-side.
 *
 * Returns an array of DayPlanIndicator objects for each day of the
 * specified month, indicating which days have meal plans.
 *
 * @param familyId - The family to look up.
 * @param year - The year (e.g. 2024).
 * @param month - The month (0-indexed, 0 = January).
 * @returns Array of day indicators, or an error.
 */
export async function getMonthlyMealPlan(
  familyId: string,
  year: number,
  month: number,
): Promise<ServerMonthlyPlanResult> {
  const supabase = createServerClient();

  try {
    // Calculate the first and last day of the month
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));

    // Generate all dates in the month
    const allDays: DayPlanIndicator[] = [];
    const current = new Date(firstDay);
    while (current <= lastDay) {
      const dateStr = current.toISOString().slice(0, 10);
      allDays.push({ date: dateStr, hasPlan: false, mealCount: 0 });
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Find all Mondays in the month range
    const mondays: string[] = [];
    const scanDate = new Date(firstDay);
    const dayOfWeek = scanDate.getUTCDay();
    const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    scanDate.setUTCDate(scanDate.getUTCDate() + offset);

    while (scanDate <= lastDay) {
      const mondayStr = scanDate.toISOString().slice(0, 10);
      mondays.push(mondayStr);
      scanDate.setUTCDate(scanDate.getUTCDate() + 7);
    }

    // Fetch each week's plan
    for (const monday of mondays) {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('family_id', familyId)
        .eq('week_start_date', monday)
        .single();

      if (data && !error) {
        const plan = data as MealPlanRow;
        const entries = await fetchEntriesWithRecipes(plan.id);

        for (const entry of entries) {
          const dayIdx = allDays.findIndex((d) => d.date === entry.date);
          if (dayIdx >= 0) {
            allDays[dayIdx].hasPlan = true;
            allDays[dayIdx].mealCount += 1;
          }
        }
      }
    }

    return { days: allDays, error: null };
  } catch (err) {
    return {
      days: [],
      error: err instanceof Error ? err.message : 'Failed to load monthly data',
    };
  }
}

// ---------------------------------------------------------------------------
// getMealPlanEntry
// ---------------------------------------------------------------------------

/**
 * Fetch a single meal plan entry by ID, with its recipe data.
 *
 * @param entryId - The meal plan entry UUID.
 * @returns The entry with recipe summary, or an error.
 */
export async function getMealPlanEntry(
  entryId: string,
): Promise<{ entry: MealPlanEntryWithRecipe | null; error: string | null }> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('meal_plan_entries')
    .select('*')
    .eq('id', entryId)
    .single();

  if (error) {
    return { entry: null, error: mapError(error, 'Meal plan entry not found') };
  }

  const row = data as MealPlanEntryRow;
  const recipe = row.recipe_id ? await fetchRecipeSummary(row.recipe_id) : null;

  return {
    entry: { ...row, recipe },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// getMealPlan
// ---------------------------------------------------------------------------

/**
 * Fetch a meal plan by ID, with all entries and recipe data.
 *
 * @param id - The meal plan UUID.
 * @returns The meal plan with entries, or an error.
 */
export async function getMealPlan(
  id: string,
): Promise<ServerMealPlanResult> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return { mealPlan: null, error: mapError(error, 'Meal plan not found') };
  }

  const plan = data as MealPlanRow;
  const entries = await fetchEntriesWithRecipes(plan.id);

  return {
    mealPlan: { ...plan, entries },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// getAuthenticatedUser
// ---------------------------------------------------------------------------

/**
 * Get the currently authenticated user ID from the server-side session.
 *
 * Useful in Server Components to verify auth before fetching data.
 *
 * @returns The user ID, or null if not authenticated.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
