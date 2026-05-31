/**
 * @module formatters
 * Formatter utility functions for MealMe.
 *
 * All functions are pure and side-effect free. They transform numeric
 * or structured data into human-readable string representations for
 * display in the UI.
 */

import { MEASUREMENT_UNITS } from '../constants/measurement-units';

// ── Fraction map ────────────────────────────────────────────────────────────

/** Maps common decimal fractions to their Unicode fraction characters. */
const FRACTION_MAP: Record<string, string> = {
  '0.25': '¼',
  '0.5': '½',
  '0.75': '¾',
  '0.33': '⅓',
  '0.67': '⅔',
};

/**
 * Converts a number to its fraction character if a common fraction
 * mapping exists, otherwise returns the number formatted with up to
 * two decimal places (trailing zeros stripped).
 */
function toFractionOrDecimal(n: number): string {
  const key = String(n);
  if (FRACTION_MAP[key]) {
    return FRACTION_MAP[key];
  }
  // Format with up to 2 decimal places, strip trailing zeros
  return parseFloat(n.toFixed(2)).toString();
}

// ── Pluralization ───────────────────────────────────────────────────────────

/**
 * Plural map built from MEASUREMENT_UNITS entries.
 *
 * Maps a unit key or abbreviation to its correct plural form.
 * Known measurement units (tsp, tbsp, oz, g, kg, ml, l) don't
 * change in the plural, while words like "pinch" become "pinches".
 */
const PLURAL_MAP: Record<string, string> = {};
for (const entry of Object.values(MEASUREMENT_UNITS)) {
  PLURAL_MAP[entry.key] = entry.plural;
  // Also index by abbreviation in case callers pass the abbreviation
  if (entry.abbreviation !== entry.key) {
    PLURAL_MAP[entry.abbreviation] = entry.plural;
  }
}

/**
 * Returns the correct plural form of a unit for a non-singular quantity.
 *
 * For known measurement units (keys in MEASUREMENT_UNITS), the plural
 * is looked up from the PLURAL_MAP. For unknown units, a simple heuristic
 * is used: words ending in 'ch' or 's' get 'es', others get 's'.
 * Units that already end in 's' are returned unchanged.
 *
 * @param unit - The unit string (key or abbreviation).
 * @param isPlural - Whether the quantity is non-singular.
 */
function pluralizeUnit(unit: string, isPlural: boolean): string {
  if (!isPlural) {
    return unit;
  }

  // Known unit — use the explicit plural form
  if (unit in PLURAL_MAP) {
    return PLURAL_MAP[unit];
  }

  // Already ends in 's' — assume already plural
  if (unit.endsWith('s')) {
    return unit;
  }

  // Words ending in 'ch' or 'sh' → add 'es' (e.g., pinch → pinches)
  if (unit.endsWith('ch') || unit.endsWith('sh')) {
    return `${unit}es`;
  }

  // Default: add 's'
  return `${unit}s`;
}

// ── formatQuantity ──────────────────────────────────────────────────────────

/**
 * Formats a quantity with its unit, handling pluralization and common
 * fraction characters.
 *
 * Plural rules:
 * - Known measurement units use their explicit plural form from
 *   MEASUREMENT_UNITS (e.g., tsp stays "tsp", cup becomes "cups",
 *   pinch becomes "pinches").
 * - Unknown units fall back to simple heuristics: 'ch'/'sh' → 'es',
 *   already ending in 's' → unchanged, else → 's'.
 *
 * @param quantity - The numeric amount.
 * @param unit - The unit of measurement (e.g., "cup", "tsp", MeasurementUnitKey).
 * @returns The formatted string.
 *
 * @example
 * ```ts
 * formatQuantity(1, 'cup');    // "1 cup"
 * formatQuantity(2, 'cup');   // "2 cups"
 * formatQuantity(0.5, 'tsp'); // "½ tsp"
 * formatQuantity(0.25, 'tsp'); // "¼ tsp"
 * formatQuantity(2, 'lbs');   // "2 lbs"  (already plural)
 * formatQuantity(2, 'pinch'); // "2 pinches"
 * formatQuantity(2, 'oz');   // "2 oz"   (abbreviation unchanged)
 * ```
 */
export function formatQuantity(quantity: number, unit: string): string {
  const displayQty = toFractionOrDecimal(quantity);
  const displayUnit = pluralizeUnit(unit, quantity !== 1);
  return `${displayQty} ${displayUnit}`;
}

// ── formatDuration ──────────────────────────────────────────────────────────

/**
 * Formats a duration in minutes into a human-readable string.
 *
 * @param minutes - The duration in minutes.
 * @returns The formatted duration string.
 *
 * @example
 * ```ts
 * formatDuration(90);  // "1 hr 30 min"
 * formatDuration(45);  // "45 min"
 * formatDuration(120); // "2 hrs"
 * formatDuration(60);  // "1 hr"
 * ```
 */
export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hrs === 0) {
    return `${mins} min`;
  }

  if (mins === 0) {
    return hrs === 1 ? '1 hr' : `${hrs} hrs`;
  }

  const hrLabel = hrs === 1 ? 'hr' : 'hrs';
  return `${hrs} ${hrLabel} ${mins} min`;
}

// ── formatCalories ──────────────────────────────────────────────────────────

/**
 * Formats a calorie count with locale-aware thousands separators.
 *
 * @param calories - The calorie count.
 * @returns The formatted calorie string.
 *
 * @example
 * ```ts
 * formatCalories(350);  // "350 cal"
 * formatCalories(1200); // "1,200 cal"
 * formatCalories(10000); // "10,000 cal"
 * ```
 */
export function formatCalories(calories: number): string {
  const formatted = calories.toLocaleString('en-US');
  return `${formatted} cal`;
}

// ── formatServings ──────────────────────────────────────────────────────────

/**
 * Formats a serving count with proper singular/plural form.
 *
 * @param servings - The number of servings.
 * @returns The formatted servings string.
 *
 * @example
 * ```ts
 * formatServings(4); // "4 servings"
 * formatServings(1); // "1 serving"
 * ```
 */
export function formatServings(servings: number): string {
  return servings === 1 ? '1 serving' : `${servings} servings`;
}

// ── formatNutrition ─────────────────────────────────────────────────────────

/**
 * Formats a nutrition info object into a one-line summary string.
 *
 * @param info - Object containing calories, protein, carbs, and fat.
 * @returns The formatted nutrition summary.
 *
 * @example
 * ```ts
 * formatNutrition({ calories: 350, protein: 25, carbs: 30, fat: 12 });
 * // "350 cal · 25g protein · 30g carbs · 12g fat"
 * ```
 */
export function formatNutrition(info: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}): string {
  const calStr = formatCalories(info.calories);
  return `${calStr} · ${info.protein}g protein · ${info.carbs}g carbs · ${info.fat}g fat`;
}
