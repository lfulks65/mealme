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
 * Each entry has a machine-readable `key` and a human-readable `label`.
 */
export const CUISINE_TYPES = {
  american: { key: 'american', label: 'American' },
  mexican: { key: 'mexican', label: 'Mexican' },
  italian: { key: 'italian', label: 'Italian' },
  chinese: { key: 'chinese', label: 'Chinese' },
  japanese: { key: 'japanese', label: 'Japanese' },
  korean: { key: 'korean', label: 'Korean' },
  thai: { key: 'thai', label: 'Thai' },
  vietnamese: { key: 'vietnamese', label: 'Vietnamese' },
  indian: { key: 'indian', label: 'Indian' },
  mediterranean: { key: 'mediterranean', label: 'Mediterranean' },
  greek: { key: 'greek', label: 'Greek' },
  french: { key: 'french', label: 'French' },
  spanish: { key: 'spanish', label: 'Spanish' },
  middleEastern: { key: 'middle-eastern', label: 'Middle Eastern' },
  caribbean: { key: 'caribbean', label: 'Caribbean' },
  african: { key: 'african', label: 'African' },
  brazilian: { key: 'brazilian', label: 'Brazilian' },
  filipino: { key: 'filipino', label: 'Filipino' },
  southern: { key: 'southern', label: 'Southern US' },
  cajun: { key: 'cajun', label: 'Cajun' },
} as const;

/** Type representing a cuisine type key. */
export type CuisineType =
  keyof typeof CUISINE_TYPES;

/** Array of all cuisine type keys for iteration. */
export const CUISINE_TYPE_KEYS: CuisineType[] =
  Object.keys(CUISINE_TYPES) as CuisineType[];

/** Human-readable label for a cuisine type key. */
export function getCuisineTypeLabel(
  key: CuisineType,
): string {
  return CUISINE_TYPES[key].label;
}
