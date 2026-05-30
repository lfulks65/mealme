/**
 * @module meal-plan
 * Meal plan domain types for MealMe.
 *
 * A MealPlan organizes Recipes into time slots across a date range,
 * typically a week. Each slot (breakfast, lunch, dinner, snack)
 * can hold one or more recipe assignments.
 */

import type { MealSlot } from '../constants/meal-slots';

/**
 * A single recipe assignment within a meal plan.
 */
export interface MealPlanEntry {
  /** Unique identifier for this entry. */
  id: string;
  /** The date this entry applies to (YYYY-MM-DD). */
  date: string;
  /** Which meal slot this entry occupies. */
  mealSlot: MealSlot;
  /** ID of the assigned Recipe. */
  recipeId: string;
  /** Number of servings to prepare. */
  servings: number;
  /** Optional note for the cook. */
  note?: string;
}

/**
 * Represents a meal plan in the MealMe system.
 *
 * Meal plans are scoped to a Family and cover a date range
 * (typically Monday–Sunday). They are the primary planning artifact
 * that drives shopping list generation.
 */
export interface MealPlan {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Reference to the Family that owns this plan. */
  familyId: string;
  /** Start date of the plan (YYYY-MM-DD), typically a Monday. */
  startDate: string;
  /** End date of the plan (YYYY-MM-DD), typically a Sunday. */
  endDate: string;
  /** Ordered recipe assignments for each day/slot. */
  entries: MealPlanEntry[];
  /** ID of the User who created this plan. */
  createdBy: string;
  /** ISO-8601 timestamp when the plan was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Payload for creating a new meal plan.
 */
export interface CreateMealPlanInput {
  familyId: string;
  startDate: string;
  endDate: string;
  entries: Omit<MealPlanEntry, 'id'>[];
}

/**
 * Payload for updating an existing meal plan.
 */
export interface UpdateMealPlanInput {
  startDate?: string;
  endDate?: string;
  entries?: Omit<MealPlanEntry, 'id'>[];
}
