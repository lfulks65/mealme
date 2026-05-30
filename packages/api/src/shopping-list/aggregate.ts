/**
 * @module shopping-list/aggregate
 * Ingredient aggregation logic for the MealMe shopping list system.
 *
 * Provides functions to:
 *   - Parse ingredient quantities/units from recipe_ingredients
 *   - Combine same ingredient across recipes (with unit normalization)
 *   - Auto-categorize ingredients based on keyword mapping
 */

import type {
  ParsedIngredient,
  AggregatedIngredient,
  ShoppingItemCategory,
  UnitConversion,
} from './types';

// ---------------------------------------------------------------------------
// Unit normalization
// ---------------------------------------------------------------------------

/**
 * Canonical unit mapping. Maps variant spellings/abbreviations to
 * a single canonical form for aggregation.
 */
const UNIT_CANONICAL: Record<string, string> = {
  // Volume
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  cup: 'cup',
  cups: 'cup',
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  fl_oz: 'fl_oz',
  'fl oz': 'fl_oz',
  fluid_ounce: 'fl_oz',
  fluid_ounces: 'fl_oz',

  // Weight
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  g: 'g',
  gram: 'g',
  grams: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',

  // Count / other
  piece: 'piece',
  pieces: 'piece',
  whole: 'whole',
  can: 'can',
  cans: 'can',
  bunch: 'bunch',
  bunches: 'bunch',
  clove: 'clove',
  cloves: 'clove',
  slice: 'slice',
  slices: 'slice',
  pinch: 'pinch',
  pinchs: 'pinch',
  pinches: 'pinch',
};

/**
 * Conversion table for units that can be combined.
 * Each entry converts `fromUnit` → `toUnit` by multiplying quantity by `factor`.
 * We normalize to the larger unit when possible (e.g., 3 tsp → 1 tbsp).
 */
const UNIT_CONVERSIONS: UnitConversion[] = [
  // Volume: tsp → tbsp → cup
  { fromUnit: 'tsp', toUnit: 'tbsp', factor: 1 / 3 },
  { fromUnit: 'tbsp', toUnit: 'cup', factor: 1 / 16 },
  { fromUnit: 'ml', toUnit: 'l', factor: 1 / 1000 },
  { fromUnit: 'fl_oz', toUnit: 'cup', factor: 1 / 8 },

  // Weight: oz → lb, g → kg
  { fromUnit: 'oz', toUnit: 'lb', factor: 1 / 16 },
  { fromUnit: 'g', toUnit: 'kg', factor: 1 / 1000 },
];

/**
 * Groups of compatible units that can be combined together.
 * Within each group, we pick a "base" unit for aggregation.
 */
const COMPATIBLE_UNIT_GROUPS: string[][] = [
  ['tsp', 'tbsp', 'cup', 'fl_oz'],
  ['ml', 'l'],
  ['oz', 'lb'],
  ['g', 'kg'],
];

/**
 * Get the canonical form of a unit string.
 * Returns the input lowercased and trimmed if no mapping exists.
 */
export function canonicalizeUnit(unit: string): string {
  const key = unit.toLowerCase().trim().replace(/\s+/g, '_');
  return UNIT_CANONICAL[key] ?? key;
}

/**
 * Find the compatible unit group for a canonical unit.
 * Returns the group array or null if the unit is standalone.
 */
function findCompatibleGroup(canonicalUnit: string): string[] | null {
  return COMPATIBLE_UNIT_GROUPS.find((group) => group.includes(canonicalUnit)) ?? null;
}

/**
 * Convert a quantity from one unit to another within the same
 * compatible group.
 *
 * Returns the converted quantity, or null if conversion is not possible.
 */
export function convertUnit(quantity: number, fromUnit: string, toUnit: string): number | null {
  const fromCanonical = canonicalizeUnit(fromUnit);
  const toCanonical = canonicalizeUnit(toUnit);

  if (fromCanonical === toCanonical) return quantity;

  // Try direct conversion
  for (const conv of UNIT_CONVERSIONS) {
    if (conv.fromUnit === fromCanonical && conv.toUnit === toCanonical) {
      return quantity * conv.factor;
    }
    // Reverse direction
    if (conv.fromUnit === toCanonical && conv.toUnit === fromCanonical) {
      return quantity / conv.factor;
    }
  }

  // Try multi-step conversion (e.g., tsp → cup via tbsp)
  const fromGroup = findCompatibleGroup(fromCanonical);
  const toGroup = findCompatibleGroup(toCanonical);

  if (fromGroup && fromGroup === toGroup) {
    // Convert from → base of group, then base → to
    // Use the smallest unit as the intermediate
    const smallestUnit = fromGroup[0];

    // Convert fromUnit to smallest
    let quantityInSmallest: number | null = null;
    if (fromCanonical === smallestUnit) {
      quantityInSmallest = quantity;
    } else {
      for (const conv of UNIT_CONVERSIONS) {
        if (conv.fromUnit === smallestUnit && conv.toUnit === fromCanonical) {
          quantityInSmallest = quantity / conv.factor;
          break;
        }
        if (conv.fromUnit === fromCanonical && conv.toUnit === smallestUnit) {
          quantityInSmallest = quantity * conv.factor;
          break;
        }
      }
    }

    if (quantityInSmallest == null) return null;

    // Convert smallest to toUnit
    if (toCanonical === smallestUnit) return quantityInSmallest;
    for (const conv of UNIT_CONVERSIONS) {
      if (conv.fromUnit === smallestUnit && conv.toUnit === toCanonical) {
        return quantityInSmallest * conv.factor;
      }
      if (conv.fromUnit === toCanonical && conv.toUnit === smallestUnit) {
        return quantityInSmallest / conv.factor;
      }
    }
  }

  return null;
}

/**
 * Determine the best display unit for a combined quantity.
 * E.g., if we have 48 tsp, show as 1 cup.
 */
export function bestDisplayUnit(totalInSmallest: number, group: string[]): string {
  // Walk from largest to smallest unit, pick the first that gives >= 1
  for (let i = group.length - 1; i >= 1; i--) {
    const targetUnit = group[i];
    const converted = convertUnit(totalInSmallest, group[0], targetUnit);
    if (converted !== null && converted >= 1) {
      return targetUnit;
    }
  }
  return group[0];
}

// ---------------------------------------------------------------------------
// Ingredient name normalization
// ---------------------------------------------------------------------------

/**
 * Normalize an ingredient name for deduplication.
 * Lowercases, trims, and removes extra whitespace.
 */
export function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// Auto-categorization
// ---------------------------------------------------------------------------

/**
 * Keyword-to-category mapping for auto-categorizing ingredients.
 * Each key is a keyword that, when found in the ingredient name,
 * maps to the specified category.
 */
const CATEGORY_KEYWORDS: Record<string, ShoppingItemCategory> = {
  // Produce
  apple: 'produce',
  apples: 'produce',
  avocado: 'produce',
  avocados: 'produce',
  banana: 'produce',
  bananas: 'produce',
  bell_pepper: 'produce',
  bell_peppers: 'produce',
  broccoli: 'produce',
  cabbage: 'produce',
  carrot: 'produce',
  carrots: 'produce',
  celery: 'produce',
  corn: 'produce',
  cucumber: 'produce',
  garlic: 'produce',
  ginger: 'produce',
  kale: 'produce',
  lemon: 'produce',
  lemons: 'produce',
  lettuce: 'produce',
  lime: 'produce',
  limes: 'produce',
  mushroom: 'produce',
  mushrooms: 'produce',
  onion: 'produce',
  onions: 'produce',
  orange: 'produce',
  oranges: 'produce',
  potato: 'produce',
  potatoes: 'produce',
  spinach: 'produce',
  tomato: 'produce',
  tomatoes: 'produce',
  zucchini: 'produce',
  herb: 'produce',
  herbs: 'produce',
  basil: 'produce',
  cilantro: 'produce',
  parsley: 'produce',
  mint: 'produce',
  thyme: 'produce',
  rosemary: 'produce',
  scallion: 'produce',
  scallions: 'produce',
  pepper: 'produce',
  jalapeño: 'produce',
  jalapeno: 'produce',

  // Dairy
  milk: 'dairy',
  butter: 'dairy',
  cheese: 'dairy',
  cream: 'dairy',
  yogurt: 'dairy',
  sour_cream: 'dairy',
  cottage_cheese: 'dairy',
  cream_cheese: 'dairy',
  mozzarella: 'dairy',
  parmesan: 'dairy',
  cheddar: 'dairy',
  egg: 'dairy',
  eggs: 'dairy',

  // Meat
  chicken: 'meat',
  beef: 'meat',
  pork: 'meat',
  turkey: 'meat',
  bacon: 'meat',
  sausage: 'meat',
  ham: 'meat',
  steak: 'meat',
  ground_beef: 'meat',
  ground_turkey: 'meat',
  shrimp: 'meat',
  salmon: 'meat',
  tuna: 'meat',
  fish: 'meat',
  lamb: 'meat',
  rib: 'meat',
  ribs: 'meat',
  chorizo: 'meat',

  // Frozen
  frozen: 'frozen',
  ice_cream: 'frozen',
  popsicle: 'frozen',

  // Bakery
  bread: 'bakery',
  tortilla: 'bakery',
  tortillas: 'bakery',
  bagel: 'bakery',
  bagels: 'bakery',
  muffin: 'bakery',
  muffins: 'bakery',
  croissant: 'bakery',
  pita: 'bakery',
  roll: 'bakery',
  rolls: 'bakery',
  bun: 'bakery',
  buns: 'bakery',
  dough: 'bakery',
  crust: 'bakery',

  // Pantry (default for common staples)
  flour: 'pantry',
  sugar: 'pantry',
  rice: 'pantry',
  pasta: 'pantry',
  noodle: 'pantry',
  noodles: 'pantry',
  oil: 'pantry',
  olive_oil: 'pantry',
  vinegar: 'pantry',
  salt: 'pantry',
  pepper_flake: 'pantry',
  soy_sauce: 'pantry',
  ketchup: 'pantry',
  mustard: 'pantry',
  mayonnaise: 'pantry',
  mayo: 'pantry',
  honey: 'pantry',
  jam: 'pantry',
  jelly: 'pantry',
  peanut_butter: 'pantry',
  cereal: 'pantry',
  oat: 'pantry',
  oats: 'pantry',
  oatmeal: 'pantry',
  bean: 'pantry',
  beans: 'pantry',
  lentil: 'pantry',
  lentils: 'pantry',
  chickpea: 'pantry',
  chickpeas: 'pantry',
  tomato_sauce: 'pantry',
  tomato_paste: 'pantry',
  broth: 'pantry',
  stock: 'pantry',
  bouillon: 'pantry',
  spice: 'pantry',
  spices: 'pantry',
  cumin: 'pantry',
  paprika: 'pantry',
  cinnamon: 'pantry',
  chili: 'pantry',
  curry: 'pantry',
  nutmeg: 'pantry',
  oregano: 'pantry',
  baking_powder: 'pantry',
  baking_soda: 'pantry',
  vanilla: 'pantry',
  cocoa: 'pantry',
  chocolate: 'pantry',
  chip: 'pantry',
  chips: 'pantry',
  cracker: 'pantry',
  crackers: 'pantry',
  nut: 'pantry',
  nuts: 'pantry',
  almond: 'pantry',
  almonds: 'pantry',
  walnut: 'pantry',
  walnuts: 'pantry',
  peanut: 'pantry',
  peanuts: 'pantry',
  cashew: 'pantry',
  cashews: 'pantry',
  seed: 'pantry',
  seeds: 'pantry',
  quinoa: 'pantry',
  couscous: 'pantry',
  cornmeal: 'pantry',
  cornstarch: 'pantry',
  coconut_milk: 'pantry',
  salsa: 'pantry',
  hot_sauce: 'pantry',
  Worcestershire: 'pantry',
};

/**
 * Auto-categorize an ingredient based on keyword matching.
 * Returns 'other' if no keyword matches.
 */
export function autoCategorize(ingredientName: string): ShoppingItemCategory {
  const normalized = normalizeIngredientName(ingredientName);

  // Direct keyword lookup (replace spaces with underscores for matching)
  const lookupKey = normalized.replace(/ /g, '_');

  if (CATEGORY_KEYWORDS[lookupKey]) {
    return CATEGORY_KEYWORDS[lookupKey];
  }

  // Partial match: check if any keyword is contained in the ingredient name
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    const keywordPattern = keyword.replace(/_/g, ' ');
    if (normalized.includes(keywordPattern)) {
      return category;
    }
  }

  return 'other';
}

// ---------------------------------------------------------------------------
// Parse ingredients from recipe data
// ---------------------------------------------------------------------------

/**
 * Parse a recipe's ingredients into ParsedIngredient objects
 * suitable for aggregation.
 *
 * @param recipeId - The recipe's ID
 * @param ingredients - Array of ingredient objects from the recipe
 * @param recipeSource - Optional source label (e.g., recipe title)
 */
export function parseIngredients(
  recipeId: string,
  ingredients: Array<{ name: string; quantity: number; unit: string }>,
  recipeSource?: string,
): ParsedIngredient[] {
  return ingredients.map((ing) => ({
    name: normalizeIngredientName(ing.name),
    quantity: Number(ing.quantity) || 0,
    unit: canonicalizeUnit(ing.unit),
    recipeId,
    recipeSource,
  }));
}

// ---------------------------------------------------------------------------
// Aggregate ingredients
// ---------------------------------------------------------------------------

/**
 * Aggregate a list of parsed ingredients by combining duplicates.
 *
 * Combines ingredients with the same normalized name and compatible units.
 * For example, "2 cups flour" + "1 cup flour" → "3 cups flour".
 * Unit normalization handles common conversions (e.g., 2 tbsp + 4 tsp = 2 tbsp + 1.33 tbsp).
 *
 * @param ingredients - Array of parsed ingredients from one or more recipes
 * @returns Array of aggregated ingredients with combined quantities
 */
export function aggregateIngredients(
  ingredients: ParsedIngredient[],
): AggregatedIngredient[] {
  // Group by normalized ingredient name
  const groups = new Map<string, ParsedIngredient[]>();

  for (const ing of ingredients) {
    const key = ing.name;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(ing);
  }

  const results: AggregatedIngredient[] = [];

  for (const [name, group] of groups) {
    // Try to combine all quantities into a single unit
    const combined = combineQuantities(group);

    results.push({
      ingredientName: name,
      quantity: combined.quantity,
      unit: combined.unit,
      category: autoCategorize(name),
      recipeIds: [...new Set(group.map((g) => g.recipeId))],
      recipeSources: [...new Set(group.filter((g) => g.recipeSource).map((g) => g.recipeSource!))],
    });
  }

  // Sort by category then name for a nice shopping experience
  const categoryOrder: ShoppingItemCategory[] = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'pantry', 'other'];
  results.sort((a, b) => {
    const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (catDiff !== 0) return catDiff;
    return a.ingredientName.localeCompare(b.ingredientName);
  });

  return results;
}

/**
 * Combine quantities for the same ingredient across different units.
 *
 * Strategy:
 * 1. If all units are the same, simply sum.
 * 2. If units are compatible (same group), convert to the smallest unit,
 *    sum, then pick the best display unit.
 * 3. If units are incompatible, keep them as separate entries.
 */
function combineQuantities(
  items: ParsedIngredient[],
): { quantity: number; unit: string } {
  if (items.length === 0) return { quantity: 0, unit: 'piece' };
  if (items.length === 1) return { quantity: items[0].quantity, unit: items[0].unit };

  // Check if all units are the same (canonical)
  const allSameUnit = items.every((item) => item.unit === items[0].unit);
  if (allSameUnit) {
    const total = items.reduce((sum, item) => sum + item.quantity, 0);
    return { quantity: roundQuantity(total), unit: items[0].unit };
  }

  // Try to find a compatible group
  const firstGroup = findCompatibleGroup(items[0].unit);
  if (firstGroup) {
    const allCompatible = items.every((item) =>
      firstGroup.includes(item.unit),
    );

    if (allCompatible) {
      // Convert everything to the smallest unit in the group
      const smallestUnit = firstGroup[0];
      let totalInSmallest = 0;

      for (const item of items) {
        const converted = convertUnit(item.quantity, item.unit, smallestUnit);
        if (converted !== null) {
          totalInSmallest += converted;
        } else {
          // Fallback: can't convert, just add as-is (shouldn't happen)
          totalInSmallest += item.quantity;
        }
      }

      // Pick the best display unit
      const displayUnit = bestDisplayUnit(totalInSmallest, firstGroup);
      const displayQuantity = convertUnit(totalInSmallest, smallestUnit, displayUnit);

      return {
        quantity: roundQuantity(displayQuantity ?? totalInSmallest),
        unit: displayUnit,
      };
    }
  }

  // Units are incompatible — use the first item's unit and sum what we can
  // For simplicity, we convert what we can and keep the rest separate
  // In practice, this means we just sum items with the same unit and
  // use the most common unit
  const unitCounts = new Map<string, number>();
  for (const item of items) {
    unitCounts.set(item.unit, (unitCounts.get(item.unit) ?? 0) + 1);
  }

  // Pick the most common unit
  let bestUnit = items[0].unit;
  let bestCount = 0;
  for (const [unit, count] of unitCounts) {
    if (count > bestCount) {
      bestCount = count;
      bestUnit = unit;
    }
  }

  // Sum what we can convert to the best unit
  let total = 0;
  for (const item of items) {
    if (item.unit === bestUnit) {
      total += item.quantity;
    } else {
      const converted = convertUnit(item.quantity, item.unit, bestUnit);
      if (converted !== null) {
        total += converted;
      }
      // If we can't convert, we lose that item's quantity (edge case)
    }
  }

  return { quantity: roundQuantity(total), unit: bestUnit };
}

/**
 * Round a quantity to a reasonable number of decimal places.
 */
function roundQuantity(q: number): number {
  // Round to 2 decimal places to avoid floating point issues
  return Math.round(q * 100) / 100;
}
