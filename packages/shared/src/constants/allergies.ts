/**
 * @module allergies
 * Allergy constants for MealMe.
 *
 * These values are used in FamilyPreferences and MemberPreferences
 * to track allergen avoidance.
 */

/**
 * All supported allergies.
 *
 * Each entry has a machine-readable `id`, a human-readable `label`,
 * an `icon` string for UI rendering, and a `severity` level.
 */
export const ALLERGIES = [
  { id: 'nuts', label: 'Tree Nuts', icon: '🥜', severity: 'critical' as const },
  { id: 'peanuts', label: 'Peanuts', icon: '🥜', severity: 'critical' as const },
  { id: 'dairy', label: 'Dairy', icon: '🥛', severity: 'moderate' as const },
  { id: 'gluten', label: 'Gluten', icon: '🌾', severity: 'moderate' as const },
  { id: 'shellfish', label: 'Shellfish', icon: '🦐', severity: 'critical' as const },
  { id: 'soy', label: 'Soy', icon: '🫘', severity: 'moderate' as const },
  { id: 'eggs', label: 'Eggs', icon: '🥚', severity: 'moderate' as const },
  { id: 'fish', label: 'Fish', icon: '🐟', severity: 'critical' as const },
  { id: 'sesame', label: 'Sesame', icon: '🫘', severity: 'critical' as const },
  { id: 'sulfites', label: 'Sulfites', icon: '🍷', severity: 'moderate' as const },
] as const;

/** Severity level for an allergy. */
export type AllergySeverity = 'critical' | 'moderate';

/** Type representing an allergy id. */
export type AllergyId = (typeof ALLERGIES)[number]['id'];

/** Array of all allergy IDs for iteration. */
export const ALLERGY_IDS: AllergyId[] = ALLERGIES.map((a) => a.id);

/** Find an allergy by its ID. */
export function getAllergyById(id: AllergyId) {
  return ALLERGIES.find((a) => a.id === id);
}

/** Human-readable label for an allergy ID. */
export function getAllergyLabel(id: AllergyId): string {
  return getAllergyById(id)?.label ?? id;
}
