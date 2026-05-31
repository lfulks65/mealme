/**
 * @module preferences/types
 * Preference domain types for the MealMe API client.
 *
 * These types mirror the Supabase `family_preferences` and
 * `member_preferences` tables and provide input/result wrappers
 * for the CRUD functions.
 */

import type { DietaryRestriction, CuisineType, AllergyId } from '@mealme/shared';
import type { BudgetRange } from '@mealme/shared';

// ---------------------------------------------------------------------------
// Database row types (match Supabase schema exactly)
// ---------------------------------------------------------------------------

/** Row from the `family_preferences` table. */
export interface FamilyPreferencesRow {
  id: string;
  family_id: string;
  dietary_restrictions: DietaryRestriction[];
  allergies: AllergyId[];
  cuisine_preferences: CuisineType[];
  budget_range: BudgetRange;
  created_at: string;
  updated_at: string;
}

/** Row from the `member_preferences` table. */
export interface MemberPreferencesRow {
  id: string;
  member_id: string;
  dietary_restrictions: DietaryRestriction[];
  allergies: AllergyId[];
  cuisine_preferences: CuisineType[];
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Domain types (camelCase for API consumers)
// ---------------------------------------------------------------------------

/** Family preferences with camelCase field names. */
export interface FamilyPreferences {
  id: string;
  familyId: string;
  dietaryRestrictions: DietaryRestriction[];
  allergies: AllergyId[];
  cuisinePreferences: CuisineType[];
  budgetRange: BudgetRange;
}

/** Member preferences with camelCase field names. */
export interface MemberPreferences {
  id: string;
  memberId: string;
  dietaryRestrictions: DietaryRestriction[];
  allergies: AllergyId[];
  cuisinePreferences: CuisineType[];
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for updating family preferences. */
export interface FamilyPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  allergies?: AllergyId[];
  cuisinePreferences?: CuisineType[];
  budgetRange?: BudgetRange;
}

/** Payload for updating member preferences. */
export interface MemberPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  allergies?: AllergyId[];
  cuisinePreferences?: CuisineType[];
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result wrapper for family preference operations. */
export interface FamilyPreferencesResult {
  preferences: FamilyPreferences | null;
  error: string | null;
}

/** Result wrapper for member preference operations. */
export interface MemberPreferencesResult {
  preferences: MemberPreferences | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a Supabase row to a camelCase domain object. */
export function toFamilyPreferences(row: FamilyPreferencesRow): FamilyPreferences {
  return {
    id: row.id,
    familyId: row.family_id,
    dietaryRestrictions: row.dietary_restrictions,
    allergies: row.allergies,
    cuisinePreferences: row.cuisine_preferences,
    budgetRange: row.budget_range,
  };
}

/** Convert a Supabase row to a camelCase domain object. */
export function toMemberPreferences(row: MemberPreferencesRow): MemberPreferences {
  return {
    id: row.id,
    memberId: row.member_id,
    dietaryRestrictions: row.dietary_restrictions,
    allergies: row.allergies,
    cuisinePreferences: row.cuisine_preferences,
  };
}

// ---------------------------------------------------------------------------
// Aggregated types
// ---------------------------------------------------------------------------

/**
 * Aggregated preference set that merges family defaults with
 * all member overrides.
 */
export interface AggregatedPreferences {
  /** The family ID these preferences belong to. */
  familyId: string;
  /** Merged dietary restrictions (family + all members, deduplicated). */
  dietaryRestrictions: DietaryRestriction[];
  /** Merged allergies (family + all members, deduplicated). */
  allergies: AllergyId[];
  /** Merged cuisine preferences (family + all members, deduplicated). */
  cuisinePreferences: CuisineType[];
  /** Budget range from family preferences. */
  budgetRange: BudgetRange;
  /** Per-member overrides that were applied. */
  memberOverrides: MemberPreferences[];
}

/** Result wrapper for aggregated preference operations. */
export interface AggregatedPreferencesResult {
  preferences: AggregatedPreferences | null;
  error: string | null;
}
