/**
 * @module preferences
 * Preference CRUD API for the MealMe platform.
 *
 * Provides functions to manage family and member preferences.
 */

// Types
export type {
  FamilyPreferencesRow,
  MemberPreferencesRow,
  FamilyPreferences,
  MemberPreferences,
  FamilyPreferencesInput,
  MemberPreferencesInput,
  FamilyPreferencesResult,
  MemberPreferencesResult,
  AggregatedPreferences,
  AggregatedPreferencesResult,
} from './types';

export { toFamilyPreferences, toMemberPreferences } from './types';

// CRUD functions
export {
  getFamilyPreferences,
  updateFamilyPreferences,
  getMemberPreferences,
  updateMemberPreferences,
  getAggregatedPreferences,
} from './functions';
