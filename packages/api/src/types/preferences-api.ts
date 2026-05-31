/**
 * @module types/preferences-api
 *
 * Preferences API request/response types.
 *
 * Extends the base domain types from `@mealme/shared` with
 * API-specific request/response wrappers for family and member
 * preference endpoints.
 */

import type {
  FamilyPreferences,
  MemberPreferences,
  UpdateFamilyPreferencesInput,
  UpdateMemberPreferencesInput,
} from '@mealme/shared';

// ---------------------------------------------------------------------------
// Family preferences
// ---------------------------------------------------------------------------

/** Response for getting family preferences. */
export type GetFamilyPreferencesResponse = FamilyPreferences;

/** Request body for updating family preferences. */
export type UpdateFamilyPreferencesRequest = UpdateFamilyPreferencesInput;

/** Response for updated family preferences. */
export type UpdateFamilyPreferencesResponse = FamilyPreferences;

// ---------------------------------------------------------------------------
// Member preferences
// ---------------------------------------------------------------------------

/** Response for getting member preferences. */
export type GetMemberPreferencesResponse = MemberPreferences;

/** Request body for updating member preferences. */
export type UpdateMemberPreferencesRequest = UpdateMemberPreferencesInput;

/** Response for updated member preferences. */
export type UpdateMemberPreferencesResponse = MemberPreferences;

// ---------------------------------------------------------------------------
// Backward-compatible aliases
// ---------------------------------------------------------------------------

/** @deprecated Use GetMemberPreferencesResponse instead. */
export type GetUserPreferencesResponse = MemberPreferences;

/** @deprecated Use UpdateMemberPreferencesRequest instead. */
export type UpdateUserPreferencesRequest = UpdateMemberPreferencesInput;

/** @deprecated Use UpdateMemberPreferencesResponse instead. */
export type UpdateUserPreferencesResponse = MemberPreferences;
