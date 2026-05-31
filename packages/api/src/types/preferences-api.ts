/**
 * @module types/preferences-api
 *
 * Preferences API request/response types.
 *
 * Extends the base domain types from `@mealme/shared` with
 * API-specific request/response wrappers for family and user
 * preference endpoints.
 */

import type {
  FamilyPreferences,
  UserPreferences,
  UpdateFamilyPreferencesInput,
  UpdateUserPreferencesInput,
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
// User preferences
// ---------------------------------------------------------------------------

/** Response for getting user preferences. */
export type GetUserPreferencesResponse = UserPreferences;

/** Request body for updating user preferences. */
export type UpdateUserPreferencesRequest = UpdateUserPreferencesInput;

/** Response for updated user preferences. */
export type UpdateUserPreferencesResponse = UserPreferences;
