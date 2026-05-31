/**
 * @module preferences
 * User and Family preference types for MealMe.
 *
 * Preferences control dietary restrictions, cuisine affinities,
 * budget settings, and other per-family or per-user customization.
 */

import type { DietaryRestriction } from '../constants/dietary-restrictions';
import type { CuisineType } from '../constants/cuisine-types';
import type { AllergyId } from '../constants/allergies';

/**
 * Budget range for grocery planning.
 */
export interface BudgetRange {
  min: number;
  max: number;
  currency: string;
}

/**
 * Per-family dietary and planning preferences.
 *
 * These preferences influence recipe suggestions, meal plan
 * generation, and shopping list optimization.
 */
export interface FamilyPreferences {
  /** Unique identifier. */
  id: string;
  /** Reference to the Family these preferences belong to. */
  familyId: string;
  /** Dietary restrictions observed by the family. */
  dietaryRestrictions: DietaryRestriction[];
  /** Allergies tracked for the family. */
  allergies: AllergyId[];
  /** Preferred cuisine types, ordered by preference. */
  cuisinePreferences: CuisineType[];
  /** Budget range for grocery planning. */
  budgetRange: BudgetRange;
  /** ISO-8601 timestamp of creation. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Per-member preference overrides.
 *
 * These are layered on top of FamilyPreferences and allow
 * individual members to express personal dietary needs.
 */
export interface MemberPreferences {
  /** Unique identifier. */
  id: string;
  /** Reference to the FamilyMember these preferences belong to. */
  memberId: string;
  /** Personal dietary restrictions (added to family-level ones). */
  dietaryRestrictions: DietaryRestriction[];
  /** Personal allergies (added to family-level ones). */
  allergies: AllergyId[];
  /** Preferred cuisine types (overrides family preferences for this member). */
  cuisinePreferences: CuisineType[];
  /** ISO-8601 timestamp of creation. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Payload for updating family preferences.
 */
export interface UpdateFamilyPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  allergies?: AllergyId[];
  cuisinePreferences?: CuisineType[];
  budgetRange?: BudgetRange;
}

/**
 * Payload for updating member preferences.
 */
export interface UpdateMemberPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  allergies?: AllergyId[];
  cuisinePreferences?: CuisineType[];
}
