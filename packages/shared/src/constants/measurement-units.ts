/**
 * @module measurement-units
 * Measurement unit constants for MealMe.
 *
 * Defines all supported units of measurement used in recipes,
 * pantry items, and grocery lists. Each entry carries a key,
 * human-readable label, abbreviation, plural form, and category.
 */

/** Category grouping for measurement units. */
export type MeasurementUnitCategory = 'volume' | 'weight' | 'count';

/**
 * All supported measurement units.
 *
 * Each entry has a machine-readable `key`, a human-readable `label`,
 * an `abbreviation`, a `plural` form, and a `category` grouping.
 *
 * The `plural` field specifies the correct plural form of the
 * abbreviation/label. For abbreviations that don't change in the
 * plural (tsp, tbsp, oz, g, kg, ml, l), the plural matches the
 * abbreviation. For words with irregular plurals (pinch → pinches),
 * the plural is explicitly provided.
 */
export const MEASUREMENT_UNITS = {
  tsp:   { key: 'tsp',   label: 'Teaspoon',    abbreviation: 'tsp',   plural: 'tsp',    category: 'volume' },
  tbsp:  { key: 'tbsp',  label: 'Tablespoon',  abbreviation: 'tbsp',  plural: 'tbsp',   category: 'volume' },
  cup:   { key: 'cup',   label: 'Cup',         abbreviation: 'cup',   plural: 'cups',   category: 'volume' },
  oz:    { key: 'oz',    label: 'Ounce',        abbreviation: 'oz',    plural: 'oz',     category: 'weight' },
  lb:    { key: 'lb',    label: 'Pound',        abbreviation: 'lb',    plural: 'lbs',    category: 'weight' },
  g:     { key: 'g',     label: 'Gram',         abbreviation: 'g',     plural: 'g',      category: 'weight' },
  kg:    { key: 'kg',    label: 'Kilogram',     abbreviation: 'kg',    plural: 'kg',     category: 'weight' },
  ml:    { key: 'ml',    label: 'Milliliter',   abbreviation: 'ml',    plural: 'ml',     category: 'volume' },
  l:     { key: 'l',     label: 'Liter',        abbreviation: 'l',     plural: 'l',      category: 'volume' },
  pinch: { key: 'pinch', label: 'Pinch',        abbreviation: 'pinch', plural: 'pinches', category: 'count' },
  clove: { key: 'clove', label: 'Clove',        abbreviation: 'clove', plural: 'cloves',  category: 'count' },
  slice: { key: 'slice', label: 'Slice',        abbreviation: 'slice', plural: 'slices',  category: 'count' },
  piece: { key: 'piece', label: 'Piece',        abbreviation: 'piece', plural: 'pieces',  category: 'count' },
  can:   { key: 'can',   label: 'Can',          abbreviation: 'can',   plural: 'cans',    category: 'count' },
  bunch: { key: 'bunch', label: 'Bunch',        abbreviation: 'bunch', plural: 'bunches', category: 'count' },
  whole: { key: 'whole', label: 'Whole',        abbreviation: 'whole', plural: 'whole',   category: 'count' },
} as const;

/** Type representing a measurement unit key. */
export type MeasurementUnitKey =
  keyof typeof MEASUREMENT_UNITS;

/** Array of all measurement unit keys for iteration. */
export const MEASUREMENT_UNIT_KEYS: MeasurementUnitKey[] =
  Object.keys(MEASUREMENT_UNITS) as MeasurementUnitKey[];

/** Human-readable label for a measurement unit key. */
export function getMeasurementUnitLabel(
  key: MeasurementUnitKey,
): string {
  return MEASUREMENT_UNITS[key].label;
}
