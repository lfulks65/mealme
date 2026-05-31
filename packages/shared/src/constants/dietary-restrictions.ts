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
 * Each entry has a machine-readable `key`, a human-readable `label`,
 * and an `icon` string for UI rendering.
 */
export const DIETARY_RESTRICTIONS = {
  vegetarian: { key: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  vegan: { key: 'vegan', label: 'Vegan', icon: '🌱' },
  glutenFree: { key: 'gluten-free', label: 'Gluten-Free', icon: '🌾' },
  dairyFree: { key: 'dairy-free', label: 'Dairy-Free', icon: '🥛' },
  nutFree: { key: 'nut-free', label: 'Nut-Free', icon: '🥜' },
  soyFree: { key: 'soy-free', label: 'Soy-Free', icon: '🫘' },
  eggFree: { key: 'egg-free', label: 'Egg-Free', icon: '🥚' },
  shellfishFree: { key: 'shellfish-free', label: 'Shellfish-Free', icon: '🦐' },
  pescatarian: { key: 'pescatarian', label: 'Pescatarian', icon: '🐟' },
  kosher: { key: 'kosher', label: 'Kosher', icon: '✡️' },
  halal: { key: 'halal', label: 'Halal', icon: '☪️' },
  lowCarb: { key: 'low-carb', label: 'Low-Carb', icon: '📉' },
  keto: { key: 'keto', label: 'Keto', icon: '🥑' },
  paleo: { key: 'paleo', label: 'Paleo', icon: '🦴' },
  whole30: { key: 'whole30', label: 'Whole30', icon: '30' },
  lowSodium: { key: 'low-sodium', label: 'Low-Sodium', icon: '🧂' },
  sugarFree: { key: 'sugar-free', label: 'Sugar-Free', icon: '🍬' },
} as const;

/** Type representing a dietary restriction key. */
export type DietaryRestriction = keyof typeof DIETARY_RESTRICTIONS;

/** Array of all dietary restriction keys for iteration. */
export const DIETARY_RESTRICTION_KEYS: DietaryRestriction[] = Object.keys(
  DIETARY_RESTRICTIONS,
) as DietaryRestriction[];

/**
 * Array format of dietary restrictions for UI rendering.
 * Each entry has `id`, `label`, and `icon` fields.
 */
export const DIETARY_RESTRICTIONS_ARRAY = Object.values(DIETARY_RESTRICTIONS).map((entry) => ({
  id: entry.key,
  label: entry.label,
  icon: entry.icon,
})) as readonly { readonly id: string; readonly label: string; readonly icon: string }[];

/** Human-readable label for a dietary restriction key. */
export function getDietaryRestrictionLabel(key: DietaryRestriction): string {
  return DIETARY_RESTRICTIONS[key].label;
}
