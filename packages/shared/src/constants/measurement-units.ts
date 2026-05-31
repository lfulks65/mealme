/**
 * @module measurement-units
 * Measurement unit constants for MealMe.
 *
 * Defines all supported units of measurement used in recipes,
 * pantry items, and grocery lists. Each entry carries a key,
 * human-readable label, abbreviation, and category.
 */

/** Category grouping for measurement units. */
export type MeasurementUnitCategory = 'volume' | 'weight' | 'count';

/**
 * All supported measurement units.
 *
 * Each entry has a machine-readable `key`, a human-readable `label`,
 * an `abbreviation`, and a `category` grouping.
 */
export const MEASUREMENT_UNITS = {
  tsp:   { key: 'tsp',   label: 'Teaspoon',    abbreviation: 'tsp',  category: 'volume' },
  tbsp:  { key: 'tbsp',  label: 'Tablespoon',  abbreviation: 'tbsp', category: 'volume' },
  cup:   { key: 'cup',   label: 'Cup',         abbreviation: 'cup',  category: 'volume' },
  oz:    { key: 'oz',    label: 'Ounce',        abbreviation: 'oz',   category: 'weight' },
  lb:    { key: 'lb',    label: 'Pound',        abbreviation: 'lb',   category: 'weight' },
  g:     { key: 'g',     label: 'Gram',         abbreviation: 'g',    category: 'weight' },
  kg:    { key: 'kg',    label: 'Kilogram',     abbreviation: 'kg',   category: 'weight' },
  ml:    { key: 'ml',    label: 'Milliliter',   abbreviation: 'ml',   category: 'volume' },
  l:     { key: 'l',     label: 'Liter',        abbreviation: 'l',    category: 'volume' },
  pinch: { key: 'pinch', label: 'Pinch',        abbreviation: 'pinch', category: 'count' },
  clove: { key: 'clove', label: 'Clove',        abbreviation: 'clove', category: 'count' },
  slice: { key: 'slice', label: 'Slice',        abbreviation: 'slice', category: 'count' },
  piece: { key: 'piece', label: 'Piece',        abbreviation: 'piece', category: 'count' },
  can:   { key: 'can',   label: 'Can',          abbreviation: 'can',   category: 'count' },
  bunch: { key: 'bunch', label: 'Bunch',        abbreviation: 'bunch', category: 'count' },
  whole: { key: 'whole', label: 'Whole',        abbreviation: 'whole', category: 'count' },
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
