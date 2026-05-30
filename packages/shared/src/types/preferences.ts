/**
 * @module preferences
 * User and Family preference types for MealMe.
 *
 * Preferences control dietary restrictions, cuisine affinities,
 * budget settings, and other per-family or per-user customization.
 */

import type { DietaryRestriction } from '../constants/dietary-restrictions';
import type { CuisineType } from '../constants/cuisine-types';
import type { BudgetTier } from '../constants/budget-tiers';
import type { MealSlot } from '../constants/meal-slots';

/**
 * Per-family dietary and planning preferences.
 *
 * These preferences influence recipe suggestions, meal plan
 * generation, and shopping list optimization.
 */
export interface FamilyPreferences {
  /** Reference to the Family these preferences belong to. */
  familyId: string;
  /** Dietary restrictions observed by the family. */
  dietaryRestrictions: DietaryRestriction[];
  /** Preferred cuisine types, ordered by preference. */
  preferredCuisines: CuisineType[];
  /** Budget tier for grocery planning. */
  budgetTier: BudgetTier;
  /** Weekly budget in USD (used when budgetTier is 'custom'). */
  customWeeklyBudget?: number;
  /** Maximum number of servings per meal. */
  maxServingsPerMeal: number;
  /** Meal slots the family typically plans for. */
  activeMealSlots: MealSlot[];
  /** Maximum prep time (minutes) the family prefers for weeknight meals. */
  maxWeeknightPrepMinutes?: number;
  /** Whether to include library recipes in suggestions. */
  includeLibraryRecipes: boolean;
  /** Ingredients the family wants to avoid (free-text). */
  excludedIngredients: string[];
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Per-user preference overrides.
 *
 * These are layered on top of FamilyPreferences and allow
 * individual users to express personal dietary needs.
 */
export interface UserPreferences {
  /** Reference to the User. */
  userId: string;
  /** Reference to the Family context for these preferences. */
  familyId: string;
  /** Personal dietary restrictions (added to family-level ones). */
  dietaryRestrictions: DietaryRestriction[];
  /** Ingredients this user specifically dislikes. */
  dislikedIngredients: string[];
  /** Preferred cuisine types (overrides family preferences for this user). */
  preferredCuisines?: CuisineType[];
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Payload for updating family preferences.
 */
export interface UpdateFamilyPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  preferredCuisines?: CuisineType[];
  budgetTier?: BudgetTier;
  customWeeklyBudget?: number;
  maxServingsPerMeal?: number;
  activeMealSlots?: MealSlot[];
  maxWeeknightPrepMinutes?: number;
  includeLibraryRecipes?: boolean;
  excludedIngredients?: string[];
}

/**
 * Payload for updating user preferences.
 */
export interface UpdateUserPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  dislikedIngredients?: string[];
  preferredCuisines?: CuisineType[];
}
