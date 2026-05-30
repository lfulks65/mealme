/**
 * @module preferences/types
 * Preference domain types for the MealMe API client.
 *
 * These types mirror the Supabase `family_preferences` and
 * `member_preferences` tables and provide input/result wrappers
 * for the CRUD functions.
 */

import type { DietaryRestriction, CuisineType, BudgetTier } from '@mealme/shared';

// ---------------------------------------------------------------------------
// Database row types (match Supabase schema exactly)
// ---------------------------------------------------------------------------

/** Row from the `family_preferences` table. */
export interface FamilyPreferencesRow {
  id: string;
  family_id: string;
  dietary_restrictions: DietaryRestriction[];
  allergies: string[];
  cuisine_preferences: CuisineType[];
  budget_tier: BudgetTier;
  household_size: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Row from the `member_preferences` table. */
export interface MemberPreferencesRow {
  id: string;
  family_id: string;
  user_id: string;
  dietary_restrictions: DietaryRestriction[];
  allergies: string[];
  cuisine_preferences: CuisineType[];
  is_override: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for upserting family preferences. */
export interface UpsertFamilyPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  allergies?: string[];
  cuisinePreferences?: CuisineType[];
  budgetTier?: BudgetTier;
  householdSize?: number;
  notes?: string | null;
}

/** Payload for upserting member preferences. */
export interface UpsertMemberPreferencesInput {
  dietaryRestrictions?: DietaryRestriction[];
  allergies?: string[];
  cuisinePreferences?: CuisineType[];
  isOverride?: boolean;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result wrapper for family preference operations. */
export interface FamilyPreferencesResult {
  preferences: FamilyPreferencesRow | null;
  error: string | null;
}

/** Result wrapper for member preference operations. */
export interface MemberPreferencesResult {
  preferences: MemberPreferencesRow | null;
  error: string | null;
}

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
  allergies: string[];
  /** Merged cuisine preferences (family + all members, deduplicated). */
  cuisinePreferences: CuisineType[];
  /** Budget tier from family preferences. */
  budgetTier: BudgetTier;
  /** Household size from family preferences. */
  householdSize: number;
  /** Notes from family preferences. */
  notes: string | null;
  /** Per-member overrides that were applied. */
  memberOverrides: MemberPreferencesRow[];
}

/** Result wrapper for aggregated preference operations. */
export interface AggregatedPreferencesResult {
  preferences: AggregatedPreferences | null;
  error: string | null;
}
