/**
 * @module cuisine-types
 * Cuisine type constants for MealMe.
 *
 * These values categorize recipes by culinary tradition
 * and are used in preferences and filtering.
 */

/**
 * All supported cuisine types.
 *
 * Each entry has a machine-readable `key`, a human-readable `label`,
 * and an `emoji` for UI rendering.
 */
export const CUISINE_TYPES = {
  american: { key: 'american', label: 'American', emoji: '🍔' },
  mexican: { key: 'mexican', label: 'Mexican', emoji: '🌮' },
  italian: { key: 'italian', label: 'Italian', emoji: '🍝' },
  chinese: { key: 'chinese', label: 'Chinese', emoji: '🥡' },
  japanese: { key: 'japanese', label: 'Japanese', emoji: '🍣' },
  korean: { key: 'korean', label: 'Korean', emoji: '🥘' },
  thai: { key: 'thai', label: 'Thai', emoji: '🍛' },
  vietnamese: { key: 'vietnamese', label: 'Vietnamese', emoji: '🍜' },
  indian: { key: 'indian', label: 'Indian', emoji: '🇮🇳' },
  mediterranean: { key: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  greek: { key: 'greek', label: 'Greek', emoji: '🇬🇷' },
  french: { key: 'french', label: 'French', emoji: '🥐' },
  spanish: { key: 'spanish', label: 'Spanish', emoji: '🇪🇸' },
  middleEastern: { key: 'middle-eastern', label: 'Middle Eastern', emoji: '🧆' },
  caribbean: { key: 'caribbean', label: 'Caribbean', emoji: '🏝️' },
  african: { key: 'african', label: 'African', emoji: '🌍' },
  brazilian: { key: 'brazilian', label: 'Brazilian', emoji: '🇧🇷' },
  filipino: { key: 'filipino', label: 'Filipino', emoji: '🇵🇭' },
  southern: { key: 'southern', label: 'Southern US', emoji: '🍗' },
  cajun: { key: 'cajun', label: 'Cajun', emoji: '🦞' },
  ethiopian: { key: 'ethiopian', label: 'Ethiopian', emoji: '🇪🇹' },
} as const;

/** Type representing a cuisine type key. */
export type CuisineType = keyof typeof CUISINE_TYPES;

/** Array of all cuisine type keys for iteration. */
export const CUISINE_TYPE_KEYS: CuisineType[] = Object.keys(CUISINE_TYPES) as CuisineType[];

/**
 * Array format of cuisine preferences for UI rendering.
 * Each entry has `id`, `label`, and `emoji` fields.
 */
export const CUISINE_PREFERENCES_ARRAY = Object.values(CUISINE_TYPES).map((entry) => ({
  id: entry.key,
  label: entry.label,
  emoji: entry.emoji,
})) as readonly { readonly id: string; readonly label: string; readonly emoji: string }[];

/** Human-readable label for a cuisine type key. */
export function getCuisineTypeLabel(key: CuisineType): string {
  return CUISINE_TYPES[key].label;
}
