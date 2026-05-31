/**
 * @module preferences
 * Convenience barrel for preference-related constants, types, and schemas.
 *
 * Re-exports from the individual constant, type, and schema modules
 * so consumers can import everything from a single entry point:
 *
 *   import { DIETARY_RESTRICTIONS, BudgetRangeSchema } from '@mealme/shared/preferences';
 */

// ── Constants ──────────────────────────────────────────────────────────────
export {
  DIETARY_RESTRICTIONS,
  DIETARY_RESTRICTION_KEYS,
  DIETARY_RESTRICTIONS_ARRAY,
  getDietaryRestrictionLabel,
} from './constants/dietary-restrictions';

export type { DietaryRestriction } from './constants/dietary-restrictions';

export { ALLERGIES, ALLERGY_IDS, getAllergyById, getAllergyLabel } from './constants/allergies';

export type { AllergyId, AllergySeverity } from './constants/allergies';

export {
  CUISINE_TYPES,
  CUISINE_TYPE_KEYS,
  CUISINE_PREFERENCES_ARRAY,
  getCuisineTypeLabel,
} from './constants/cuisine-types';

export type { CuisineType } from './constants/cuisine-types';

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  BudgetRange,
  FamilyPreferences,
  MemberPreferences,
  UpdateFamilyPreferencesInput,
  UpdateMemberPreferencesInput,
} from './types/preferences';

// ── Schemas ────────────────────────────────────────────────────────────────
export {
  BudgetRangeSchema,
  FamilyPreferencesSchema,
  MemberPreferencesSchema,
  UpdateFamilyPreferencesInputSchema,
  UpdateMemberPreferencesInputSchema,
} from './schemas/preferences';

export type {
  BudgetRangeInput,
  FamilyPreferencesInput,
  MemberPreferencesInput,
  UpdateFamilyPreferencesInputSchemaType,
  UpdateMemberPreferencesInputSchemaType,
} from './schemas/preferences';
