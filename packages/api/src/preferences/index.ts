/**
 * @module preferences
 * Preference CRUD API and aggregation for the MealMe platform.
 *
 * Provides functions to manage family and member preferences,
 * and to compute the aggregated preference set by merging
 * family defaults with member overrides.
 */

// Types
export type {
  FamilyPreferencesRow,
  MemberPreferencesRow,
  UpsertFamilyPreferencesInput,
  UpsertMemberPreferencesInput,
  FamilyPreferencesResult,
  MemberPreferencesResult,
  AggregatedPreferences,
  AggregatedPreferencesResult,
} from './types';

// CRUD functions
export {
  getFamilyPreferences,
  upsertFamilyPreferences,
  getMemberPreferences,
  upsertMemberPreferences,
  getAggregatedPreferences,
} from './functions';
