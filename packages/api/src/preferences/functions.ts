/**
 * @module preferences/functions
 * Preference CRUD functions for the MealMe API client.
 *
 * All functions interact with Supabase directly and rely on RLS
 * policies for authorization. The current user's session is used
 * implicitly via the Supabase client.
 */

import { supabase } from '../supabase';
import type {
  FamilyPreferencesRow,
  MemberPreferencesRow,
  FamilyPreferencesInput,
  MemberPreferencesInput,
  FamilyPreferencesResult,
  MemberPreferencesResult,
  AggregatedPreferences,
  AggregatedPreferencesResult,
} from './types';
import { toFamilyPreferences, toMemberPreferences } from './types';
import type { DietaryRestriction, CuisineType, AllergyId } from '@mealme/shared';

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

// ---------------------------------------------------------------------------
// getFamilyPreferences
// ---------------------------------------------------------------------------

/**
 * Fetch the family preferences for a given family.
 *
 * RLS ensures only family members can read these preferences.
 */
export async function getFamilyPreferences(familyId: string): Promise<FamilyPreferencesResult> {
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

  return { preferences: toFamilyPreferences(data as FamilyPreferencesRow), error: null };
}

// ---------------------------------------------------------------------------
// updateFamilyPreferences
// ---------------------------------------------------------------------------

/**
 * Create or update family preferences for a given family.
 *
 * Uses Supabase upsert on the `family_id` unique constraint.
 * RLS ensures only family owners/admins can write these preferences.
 */
export async function updateFamilyPreferences(
  familyId: string,
  input: FamilyPreferencesInput,
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
  if (input.budgetRange !== undefined) {
    payload.budget_range = input.budgetRange;
  }

  const { data, error } = await supabase
    .from('family_preferences')
    .upsert(payload, { onConflict: 'family_id' })
    .select('*')
    .single();

  if (error) {
    return { preferences: null, error: mapError(error, 'Failed to update family preferences') };
  }

  return { preferences: toFamilyPreferences(data as FamilyPreferencesRow), error: null };
}

// ---------------------------------------------------------------------------
// getMemberPreferences
// ---------------------------------------------------------------------------

/**
 * Fetch the member preferences for a specific family member.
 *
 * RLS ensures only the member themselves can read their preferences.
 */
export async function getMemberPreferences(memberId: string): Promise<MemberPreferencesResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { preferences: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('member_preferences')
    .select('*')
    .eq('member_id', memberId)
    .single();

  if (error) {
    return { preferences: null, error: mapError(error, 'Member preferences not found') };
  }

  return { preferences: toMemberPreferences(data as MemberPreferencesRow), error: null };
}

// ---------------------------------------------------------------------------
// updateMemberPreferences
// ---------------------------------------------------------------------------

/**
 * Create or update member preferences for a specific family member.
 *
 * Uses Supabase upsert on the `member_id` unique constraint.
 * RLS ensures users can only write their own preferences.
 */
export async function updateMemberPreferences(
  memberId: string,
  input: MemberPreferencesInput,
): Promise<MemberPreferencesResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { preferences: null, error: 'Not authenticated' };
  }

  // Build the upsert payload — only include defined fields
  const payload: Record<string, unknown> = {
    member_id: memberId,
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

  const { data, error } = await supabase
    .from('member_preferences')
    .upsert(payload, { onConflict: 'member_id' })
    .select('*')
    .single();

  if (error) {
    return { preferences: null, error: mapError(error, 'Failed to update member preferences') };
  }

  return { preferences: toMemberPreferences(data as MemberPreferencesRow), error: null };
}

// ---------------------------------------------------------------------------
// Helpers for aggregation
// ---------------------------------------------------------------------------

/**
 * Deduplicate and merge arrays, preserving order.
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
 *   - `budgetRange`: from family only
 *   - `memberOverrides`: list of all member preference rows
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

  // Fetch all member preferences for this family via family_members join
  const { data: memberData, error: memberError } = await supabase
    .from('family_members')
    .select('id, member_preferences(*)')
    .eq('family_id', familyId);

  if (memberError) {
    return {
      preferences: null,
      error: mapError(memberError, 'Failed to fetch member preferences'),
    };
  }

  // Extract member preferences rows from the join result
  const memberPrefs: MemberPreferencesRow[] = (memberData ?? []).flatMap(
    (fm: any) => fm.member_preferences ?? [],
  ) as MemberPreferencesRow[];

  // Merge dietary restrictions: family + all members
  const allDietaryRestrictions = memberPrefs.reduce<DietaryRestriction[]>(
    (acc, m) => mergeUnique(acc, ...(m.dietary_restrictions as DietaryRestriction[])),
    [...(familyPrefs.dietary_restrictions as DietaryRestriction[])],
  );

  // Merge allergies: family + all members
  const allAllergies = memberPrefs.reduce<AllergyId[]>(
    (acc, m) => mergeUnique(acc, ...(m.allergies as AllergyId[])),
    [...(familyPrefs.allergies as AllergyId[])],
  );

  // Merge cuisine preferences: family first, then member additions
  const allCuisinePreferences = memberPrefs.reduce<CuisineType[]>(
    (acc, m) => mergeUnique(acc, ...(m.cuisine_preferences as CuisineType[])),
    [...(familyPrefs.cuisine_preferences as CuisineType[])],
  );

  const aggregated: AggregatedPreferences = {
    familyId,
    dietaryRestrictions: allDietaryRestrictions,
    allergies: allAllergies,
    cuisinePreferences: allCuisinePreferences,
    budgetRange: familyPrefs.budget_range,
    memberOverrides: memberPrefs.map(toMemberPreferences),
  };

  return { preferences: aggregated, error: null };
}
