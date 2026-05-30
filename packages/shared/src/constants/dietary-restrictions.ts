/**
 * @module dietary-restrictions
 * Dietary restriction constants for MealMe.
 *
 * These values are used as tags on Recipes, FamilyPreferences,
 * and UserPreferences to filter and match content.
 */

/**
 * All supported dietary restrictions.
 *
 * Each entry has a machine-readable `key` and a human-readable `label`.
 */
export const DIETARY_RESTRICTIONS = {
  vegetarian: { key: 'vegetarian', label: 'Vegetarian' },
  vegan: { key: 'vegan', label: 'Vegan' },
  glutenFree: { key: 'gluten-free', label: 'Gluten-Free' },
  dairyFree: { key: 'dairy-free', label: 'Dairy-Free' },
  nutFree: { key: 'nut-free', label: 'Nut-Free' },
  soyFree: { key: 'soy-free', label: 'Soy-Free' },
  eggFree: { key: 'egg-free', label: 'Egg-Free' },
  shellfishFree: { key: 'shellfish-free', label: 'Shellfish-Free' },
  pescatarian: { key: 'pescatarian', label: 'Pescatarian' },
  kosher: { key: 'kosher', label: 'Kosher' },
  halal: { key: 'halal', label: 'Halal' },
  lowCarb: { key: 'low-carb', label: 'Low-Carb' },
  keto: { key: 'keto', label: 'Keto' },
  paleo: { key: 'paleo', label: 'Paleo' },
  whole30: { key: 'whole30', label: 'Whole30' },
  lowSodium: { key: 'low-sodium', label: 'Low-Sodium' },
  sugarFree: { key: 'sugar-free', label: 'Sugar-Free' },
} as const;

/** Type representing a dietary restriction key. */
export type DietaryRestriction =
  keyof typeof DIETARY_RESTRICTIONS;

/** Array of all dietary restriction keys for iteration. */
export const DIETARY_RESTRICTION_KEYS: DietaryRestriction[] =
  Object.keys(DIETARY_RESTRICTIONS) as DietaryRestriction[];

/** Human-readable label for a dietary restriction key. */
export function getDietaryRestrictionLabel(
  key: DietaryRestriction,
): string {
  return DIETARY_RESTRICTIONS[key].label;
}
