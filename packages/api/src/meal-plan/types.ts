/**
 * @module meal-plan/types
 * Meal plan domain types for the MealMe API client.
 *
 * These types mirror the Supabase `meal_plans` and `meal_plan_entries`
 * tables and provide input/result wrappers for the CRUD functions.
 */

import type { MealSlot } from '@mealme/shared';

// ---------------------------------------------------------------------------
// Database row types (match Supabase schema exactly)
// ---------------------------------------------------------------------------

/** Row from the `meal_plans` table. */
export interface MealPlanRow {
  id: string;
  family_id: string;
  week_start_date: string;
  created_by: string;
  created_at: string;
  status: MealPlanStatus;
}

/** Status of a meal plan. */
export type MealPlanStatus = 'draft' | 'active' | 'archived';

/** Row from the `meal_plan_entries` table. */
export interface MealPlanEntryRow {
  id: string;
  meal_plan_id: string;
  date: string;
  meal_slot: MealSlot;
  recipe_id: string | null;
  servings: number;
  notes: string | null;
  created_at: string;
}

/** Recipe summary joined into a meal plan entry. */
export interface RecipeSummary {
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

/** A meal plan entry with its joined recipe data. */
export interface MealPlanEntryWithRecipe extends MealPlanEntryRow {
  recipe: RecipeSummary | null;
}

/** A meal plan with all its entries (recipes joined). */
export interface MealPlanWithEntries extends MealPlanRow {
  entries: MealPlanEntryWithRecipe[];
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for adding a meal plan entry. */
export interface AddMealEntryInput {
  date: string;
  mealSlot: MealSlot;
  recipeId: string;
  servings?: number;
  notes?: string;
}

/** Payload for updating a meal plan entry. */
export interface UpdateMealEntryInput {
  date?: string;
  mealSlot?: MealSlot;
  recipeId?: string | null;
  servings?: number;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result wrapper for meal plan operations. */
export interface MealPlanResult {
  mealPlan: MealPlanWithEntries | null;
  error: string | null;
}

/** Result wrapper for meal plan entry operations. */
export interface MealPlanEntryResult {
  entry: MealPlanEntryWithRecipe | null;
  error: string | null;
}

/** Result wrapper for the AI proposal generator. */
export interface MealPlanProposalResult {
  mealPlan: MealPlanWithEntries | null;
  error: string | null;
}
