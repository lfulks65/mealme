/**
 * @module types/meal-plan-api
 *
 * Meal plan API request/response types.
 *
 * Extends the base domain types from `@mealme/shared` with
 * API-specific request/response wrappers for meal plan CRUD endpoints.
 */

import type {
  MealPlan,
  CreateMealPlanInput,
  UpdateMealPlanInput,
} from '@mealme/shared';

import type { PaginatedResponse, PaginationParams } from './api';

// ---------------------------------------------------------------------------
// List meal plans
// ---------------------------------------------------------------------------

/** Request parameters for listing meal plans. */
export interface ListMealPlansRequest extends PaginationParams {
  /** Filter by family. */
  familyId: string;
  /** Filter by week start date (YYYY-MM-DD). */
  weekStart?: string;
}

/** Paginated response of meal plans. */
export type ListMealPlansResponse = PaginatedResponse<MealPlan>;

// ---------------------------------------------------------------------------
// Get meal plan
// ---------------------------------------------------------------------------

/** Response for a single meal plan. */
export type GetMealPlanResponse = MealPlan;

// ---------------------------------------------------------------------------
// Create meal plan
// ---------------------------------------------------------------------------

/** Request body for creating a meal plan. */
export type CreateMealPlanRequest = CreateMealPlanInput;

/** Response for a created meal plan. */
export type CreateMealPlanResponse = MealPlan;

// ---------------------------------------------------------------------------
// Update meal plan
// ---------------------------------------------------------------------------

/** Request body for updating a meal plan. */
export type UpdateMealPlanRequest = UpdateMealPlanInput;

/** Response for an updated meal plan. */
export type UpdateMealPlanResponse = MealPlan;

// ---------------------------------------------------------------------------
// Delete meal plan
// ---------------------------------------------------------------------------

/** Response for a deleted meal plan. */
export type DeleteMealPlanResponse = { success: boolean };
