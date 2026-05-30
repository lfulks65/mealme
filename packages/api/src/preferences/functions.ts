/**
 * @module preferences/functions
 * Preference CRUD and aggregation functions for the MealMe API client.
 *
 * All functions interact with Supabase directly and rely on RLS
 * policies for authorization. The current user's session is used
 * implicitly via the Supabase client.
 */

import { supabase } from '../supabase';
import type {
  FamilyPreferencesRow,
  MemberPreferencesRow,
  UpsertFamilyPreferencesInput,
  UpsertMemberPreferencesInput,
  FamilyPreferencesResult,
  MemberPreferencesResult,
  AggregatedPreferences,
  AggregatedPreferencesResult,
} from './types';
import type { DietaryRestriction, CuisineType, BudgetTier } from '@mealme/shared';

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

/**
 * Deduplicate and merge string arrays, preserving order.
 * First occurrence wins for ordering.
 */
function mergeUnique<T>(base: T[], ...overrides: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of [...base, ...overrides]) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// getFamilyPreferences
// ---------------------------------------------------------------------------

/**
 * Fetch the family preferences for a given family.
 *
 * RLS ensures only family members can read these preferences.
 */
export async function getFamilyPreferences(
  familyId: string,
): Promise<FamilyPreferencesResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { preferences: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('family_preferences')
    .select('*')
    .eq('family_id', familyId)
    .single();

  if (error) {
    return { preferences: null, error: mapError(error, 'Family preferences not found') };
  }

  return { preferences: data as FamilyPreferencesRow, error: null };
}

// ---------------------------------------------------------------------------
// upsertFamilyPreferences
// ---------------------------------------------------------------------------

/**
 * Create or update family preferences for a given family.
 *
 * Uses Supabase upsert on the `family_id` unique constraint.
 * RLS ensures only family members can write these preferences.
 */
export async function upsertFamilyPreferences(
  familyId: string,
  input: UpsertFamilyPreferencesInput,
): Promise<FamilyPreferencesResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { preferences: null, error: 'Not authenticated' };
  }

  // Build the upsert payload — only include defined fields
  const payload: Record<string, unknown> = {
    family_id: familyId,
  };

  if (input.dietaryRestrictions !== undefined) {
    payload.dietary_restrictions = input.dietaryRestrictions;
  }
  if (input.allergies !== undefined) {
    payload.allergies = input.allergies;
  }
  if (input.cuisinePreferences !== undefined) {
    payload.cuisine_preferences = input.cuisinePreferences;
  }
  if (input.budgetTier !== undefined) {
    payload.budget_tier = input.budgetTier;
  }
  if (input.householdSize !== undefined) {
    payload.household_size = input.householdSize;
  }
  if (input.notes !== undefined) {
    payload.notes = input.notes;
  }

  const { data, error } = await supabase
    .from('family_preferences')
    .upsert(payload, { onConflict: 'family_id' })
    .select('*')
    .single();

  if (error) {
    return { preferences: null, error: mapError(error, 'Failed to upsert family preferences') };
  }

  return { preferences: data as FamilyPreferencesRow, error: null };
}

// ---------------------------------------------------------------------------
// getMemberPreferences
// ---------------------------------------------------------------------------

/**
 * Fetch the member preferences for a specific user within a family.
 *
 * RLS ensures only family members can read, and users can only
 * write their own preferences.
 */
export async function getMemberPreferences(
  familyId: string,
  userId: string,
): Promise<MemberPreferencesResult> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { preferences: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('member_preferences')
    .select('*')
    .eq('family_id', familyId)
    .eq('user_id', userId)
    .single();

  if (error) {
    return { preferences: null, error: mapError(error, 'Member preferences not found') };
  }

  return { preferences: data as MemberPreferencesRow, error: null };
}

// ---------------------------------------------------------------------------
// upsertMemberPreferences
// ---------------------------------------------------------------------------

/**
 * Create or update member preferences for a specific user within a family.
 *
 * Uses Supabase upsert on the `(family_id, user_id)` unique constraint.
 * RLS ensures users can only write their own preferences.
 */
export async function upsertMemberPreferences(
  familyId: string,
  userId: string,
  input: UpsertMemberPreferencesInput,
): Promise<MemberPreferencesResult> {
  const currentUserId = await getCurrentUserId();
  if (!currentUserId) {
    return { preferences: null, error: 'Not authenticated' };
  }

  // Users can only upsert their own member preferences
  if (userId !== currentUserId) {
    return { preferences: null, error: 'You can only update your own preferences' };
  }

  // Build the upsert payload — only include defined fields
  const payload: Record<string, unknown> = {
    family_id: familyId,
    user_id: userId,
  };

  if (input.dietaryRestrictions !== undefined) {
    payload.dietary_restrictions = input.dietaryRestrictions;
  }
  if (input.allergies !== undefined) {
    payload.allergies = input.allergies;
  }
  if (input.cuisinePreferences !== undefined) {
    payload.cuisine_preferences = input.cuisinePreferences;
  }
  if (input.isOverride !== undefined) {
    payload.is_override = input.isOverride;
  }

  const { data, error } = await supabase
    .from('member_preferences')
    .upsert(payload, { onConflict: 'family_id,user_id' })
    .select('*')
    .single();

  if (error) {
    return { preferences: null, error: mapError(error, 'Failed to upsert member preferences') };
  }

  return { preferences: data as MemberPreferencesRow, error: null };
}

// ---------------------------------------------------------------------------
// getAggregatedPreferences
// ---------------------------------------------------------------------------

/**
 * Merge family defaults with all member overrides into a final
 * preference set.
 *
 * Merge rules:
 *   - `dietaryRestrictions`: union of family + all member overrides
 *   - `allergies`: union of family + all member overrides
 *   - `cuisinePreferences`: family list, then any member-only
 *     cuisines appended (deduplicated)
 *   - `budgetTier`, `householdSize`, `notes`: from family only
 *   - `memberOverrides`: list of all member preference rows that
 *     have `is_override = true`
 */
export async function getAggregatedPreferences(
  familyId: string,
): Promise<AggregatedPreferencesResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { preferences: null, error: 'Not authenticated' };
  }

  // Fetch family preferences
  const { data: familyData, error: familyError } = await supabase
    .from('family_preferences')
    .select('*')
    .eq('family_id', familyId)
    .single();

  if (familyError) {
    return { preferences: null, error: mapError(familyError, 'Family preferences not found') };
  }

  const familyPrefs = familyData as FamilyPreferencesRow;

  // Fetch all member preferences for this family
  const { data: memberData, error: memberError } = await supabase
    .from('member_preferences')
    .select('*')
    .eq('family_id', familyId);

  if (memberError) {
    return { preferences: null, error: mapError(memberError, 'Failed to fetch member preferences') };
  }

  const memberPrefs = (memberData ?? []) as MemberPreferencesRow[];

  // Filter to only override members
  const overrideMembers = memberPrefs.filter((m) => m.is_override);

  // Merge dietary restrictions: family + all override members
  const allDietaryRestrictions = overrideMembers.reduce<DietaryRestriction[]>(
    (acc, m) => mergeUnique(acc, ...(m.dietary_restrictions as DietaryRestriction[])),
    [...(familyPrefs.dietary_restrictions as DietaryRestriction[])],
  );

  // Merge allergies: family + all override members
  const allAllergies = overrideMembers.reduce<string[]>(
    (acc, m) => mergeUnique(acc, ...(m.allergies as string[])),
    [...(familyPrefs.allergies as string[])],
  );

  // Merge cuisine preferences: family first, then member additions
  const allCuisinePreferences = overrideMembers.reduce<CuisineType[]>(
    (acc, m) => mergeUnique(acc, ...(m.cuisine_preferences as CuisineType[])),
    [...(familyPrefs.cuisine_preferences as CuisineType[])],
  );

  const aggregated: AggregatedPreferences = {
    familyId,
    dietaryRestrictions: allDietaryRestrictions,
    allergies: allAllergies,
    cuisinePreferences: allCuisinePreferences,
    budgetTier: familyPrefs.budget_tier as BudgetTier,
    householdSize: familyPrefs.household_size,
    notes: familyPrefs.notes,
    memberOverrides: overrideMembers,
  };

  return { preferences: aggregated, error: null };
}
