/**
 * @module formatters
 * Formatter utility functions for MealMe.
 *
 * All functions are pure and side-effect free. They transform numeric
 * or structured data into human-readable string representations for
 * display in the UI.
 */

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

// ── formatQuantity ──────────────────────────────────────────────────────────

/**
 * Formats a quantity with its unit, handling pluralization and common
 * fraction characters.
 *
 * Simple plural rule: appends 's' when `quantity !== 1` and the unit
 * does not already end in 's'.
 *
 * @param quantity - The numeric amount.
 * @param unit - The unit of measurement (e.g., "cup", "tsp").
 * @returns The formatted string.
 *
 * @example
 * ```ts
 * formatQuantity(1, 'cup');   // "1 cup"
 * formatQuantity(2, 'cup');   // "2 cups"
 * formatQuantity(0.5, 'tsp'); // "½ tsp"
 * formatQuantity(0.25, 'tsp'); // "¼ tsp"
 * formatQuantity(2, 'lbs');   // "2 lbs"  (already plural)
 * ```
 */
export function formatQuantity(quantity: number, unit: string): string {
  const displayQty = toFractionOrDecimal(quantity);
  const pluralSuffix = quantity !== 1 && !unit.endsWith('s') ? 's' : '';
  return `${displayQty} ${unit}${pluralSuffix}`;
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
