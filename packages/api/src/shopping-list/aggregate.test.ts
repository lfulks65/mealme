/**
 * @module shopping-list/aggregate.test
 * Unit tests for ingredient aggregation logic.
 *
 * These tests exercise pure functions — no Supabase mocking needed.
 */

import { describe, it, expect } from 'vitest';
import {
  canonicalizeUnit,
  convertUnit,
  bestDisplayUnit,
  normalizeIngredientName,
  autoCategorize,
  parseIngredients,
  aggregateIngredients,
} from './aggregate';

// ---------------------------------------------------------------------------
// canonicalizeUnit
// ---------------------------------------------------------------------------

describe('canonicalizeUnit', () => {
  it('maps common variants to canonical forms', () => {
    expect(canonicalizeUnit('tsp')).toBe('tsp');
    expect(canonicalizeUnit('teaspoon')).toBe('tsp');
    expect(canonicalizeUnit('teaspoons')).toBe('tsp');
    expect(canonicalizeUnit('tbsp')).toBe('tbsp');
    expect(canonicalizeUnit('tablespoon')).toBe('tbsp');
    expect(canonicalizeUnit('cups')).toBe('cup');
    expect(canonicalizeUnit('cup')).toBe('cup');
    expect(canonicalizeUnit('lb')).toBe('lb');
    expect(canonicalizeUnit('pounds')).toBe('lb');
    expect(canonicalizeUnit('oz')).toBe('oz');
    expect(canonicalizeUnit('ounces')).toBe('oz');
    expect(canonicalizeUnit('g')).toBe('g');
    expect(canonicalizeUnit('grams')).toBe('g');
    expect(canonicalizeUnit('kg')).toBe('kg');
    expect(canonicalizeUnit('ml')).toBe('ml');
    expect(canonicalizeUnit('l')).toBe('l');
  });

  it('handles case insensitivity', () => {
    expect(canonicalizeUnit('Cups')).toBe('cup');
    expect(canonicalizeUnit('TABLESPOON')).toBe('tbsp');
    expect(canonicalizeUnit('Pounds')).toBe('lb');
  });

  it('handles whitespace', () => {
    expect(canonicalizeUnit('  cup  ')).toBe('cup');
    expect(canonicalizeUnit('fl oz')).toBe('fl_oz');
    expect(canonicalizeUnit('fluid_ounce')).toBe('fl_oz');
  });

  it('returns lowercased input for unknown units', () => {
    expect(canonicalizeUnit('sprig')).toBe('sprig');
    expect(canonicalizeUnit('Custom')).toBe('custom');
  });
});

// ---------------------------------------------------------------------------
// convertUnit
// ---------------------------------------------------------------------------

describe('convertUnit', () => {
  it('returns same quantity when units are identical', () => {
    expect(convertUnit(3, 'cup', 'cup')).toBe(3);
    expect(convertUnit(1, 'tsp', 'tsp')).toBe(1);
  });

  it('converts tsp → tbsp', () => {
    expect(convertUnit(3, 'tsp', 'tbsp')).toBe(1);
  });

  it('converts tbsp → cup', () => {
    expect(convertUnit(16, 'tbsp', 'cup')).toBe(1);
  });

  it('converts tsp → cup (multi-step)', () => {
    // 48 tsp = 16 tbsp = 1 cup
    expect(convertUnit(48, 'tsp', 'cup')).toBe(1);
  });

  it('converts cup → tsp (reverse)', () => {
    expect(convertUnit(1, 'cup', 'tsp')).toBe(48);
  });

  it('converts tbsp → tsp (reverse)', () => {
    expect(convertUnit(1, 'tbsp', 'tsp')).toBe(3);
  });

  it('converts oz → lb', () => {
    expect(convertUnit(16, 'oz', 'lb')).toBe(1);
  });

  it('converts lb → oz (reverse)', () => {
    expect(convertUnit(1, 'lb', 'oz')).toBe(16);
  });

  it('converts g → kg', () => {
    expect(convertUnit(1000, 'g', 'kg')).toBe(1);
  });

  it('converts ml → l', () => {
    expect(convertUnit(1000, 'ml', 'l')).toBe(1);
  });

  it('converts fl_oz → cup', () => {
    expect(convertUnit(8, 'fl_oz', 'cup')).toBe(1);
  });

  it('returns null for incompatible units', () => {
    expect(convertUnit(1, 'cup', 'lb')).toBeNull();
    expect(convertUnit(1, 'g', 'tsp')).toBeNull();
  });

  it('handles variant unit names via canonicalization', () => {
    expect(convertUnit(3, 'teaspoons', 'tbsp')).toBe(1);
    expect(convertUnit(1, 'pound', 'oz')).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// bestDisplayUnit
// ---------------------------------------------------------------------------

describe('bestDisplayUnit', () => {
  it('picks cup when quantity >= 1 cup', () => {
    const group = ['tsp', 'tbsp', 'cup'];
    expect(bestDisplayUnit(48, group)).toBe('cup'); // 48 tsp = 1 cup
  });

  it('picks tbsp when quantity < 1 cup but >= 1 tbsp', () => {
    const group = ['tsp', 'tbsp', 'cup'];
    expect(bestDisplayUnit(6, group)).toBe('tbsp'); // 6 tsp = 2 tbsp
  });

  it('picks smallest unit when quantity < 1 of next unit', () => {
    const group = ['tsp', 'tbsp', 'cup', 'fl_oz'];
    expect(bestDisplayUnit(2, group)).toBe('tsp'); // 2 tsp = 2 tsp
  });

  it('picks lb when quantity >= 1 lb', () => {
    const group = ['oz', 'lb'];
    expect(bestDisplayUnit(16, group)).toBe('lb');
  });

  it('picks kg when quantity >= 1 kg', () => {
    const group = ['g', 'kg'];
    expect(bestDisplayUnit(1000, group)).toBe('kg');
  });
});

// ---------------------------------------------------------------------------
// normalizeIngredientName
// ---------------------------------------------------------------------------

describe('normalizeIngredientName', () => {
  it('lowercases and trims', () => {
    expect(normalizeIngredientName('  Flour  ')).toBe('flour');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeIngredientName('olive   oil')).toBe('olive oil');
  });

  it('handles already-normalized names', () => {
    expect(normalizeIngredientName('salt')).toBe('salt');
  });
});

// ---------------------------------------------------------------------------
// autoCategorize
// ---------------------------------------------------------------------------

describe('autoCategorize', () => {
  it('categorizes produce items', () => {
    expect(autoCategorize('tomato')).toBe('produce');
    expect(autoCategorize('onion')).toBe('produce');
    expect(autoCategorize('garlic')).toBe('produce');
    expect(autoCategorize('spinach')).toBe('produce');
    expect(autoCategorize('bell pepper')).toBe('produce');
  });

  it('categorizes dairy items', () => {
    expect(autoCategorize('milk')).toBe('dairy');
    expect(autoCategorize('butter')).toBe('dairy');
    expect(autoCategorize('cheese')).toBe('dairy');
    expect(autoCategorize('eggs')).toBe('dairy');
    expect(autoCategorize('sour cream')).toBe('dairy');
  });

  it('categorizes meat items', () => {
    expect(autoCategorize('chicken')).toBe('meat');
    expect(autoCategorize('ground beef')).toBe('meat');
    expect(autoCategorize('bacon')).toBe('meat');
    expect(autoCategorize('salmon')).toBe('meat');
    expect(autoCategorize('shrimp')).toBe('meat');
  });

  it('categorizes pantry items', () => {
    expect(autoCategorize('flour')).toBe('pantry');
    expect(autoCategorize('sugar')).toBe('pantry');
    expect(autoCategorize('rice')).toBe('pantry');
    expect(autoCategorize('olive oil')).toBe('pantry');
    expect(autoCategorize('soy sauce')).toBe('pantry');
  });

  it('categorizes bakery items', () => {
    expect(autoCategorize('bread')).toBe('bakery');
    expect(autoCategorize('tortillas')).toBe('bakery');
    expect(autoCategorize('bagels')).toBe('bakery');
  });

  it('categorizes frozen items', () => {
    expect(autoCategorize('frozen peas')).toBe('frozen');
    expect(autoCategorize('ice cream')).toBe('frozen');
  });

  it('returns other for unknown ingredients', () => {
    expect(autoCategorize('tofu')).toBe('other');
    expect(autoCategorize('seitan')).toBe('other');
  });

  it('handles case insensitivity', () => {
    expect(autoCategorize('Chicken')).toBe('meat');
    expect(autoCategorize('OLIVE OIL')).toBe('pantry');
  });

  it('matches partial keywords', () => {
    expect(autoCategorize('chicken breast')).toBe('meat');
    expect(autoCategorize('cheddar cheese')).toBe('dairy');
    expect(autoCategorize('garlic powder')).toBe('produce');
  });
});

// ---------------------------------------------------------------------------
// parseIngredients
// ---------------------------------------------------------------------------

describe('parseIngredients', () => {
  it('parses raw ingredient objects into ParsedIngredients', () => {
    const result = parseIngredients(
      'recipe-1',
      [
        { name: 'Flour', quantity: 2, unit: 'cups' },
        { name: 'Sugar', quantity: 1, unit: 'cup' },
      ],
      'Pancakes',
    );

    expect(result).toEqual([
      { name: 'flour', quantity: 2, unit: 'cup', recipeId: 'recipe-1', recipeSource: 'Pancakes' },
      { name: 'sugar', quantity: 1, unit: 'cup', recipeId: 'recipe-1', recipeSource: 'Pancakes' },
    ]);
  });

  it('canonicalizes units during parsing', () => {
    const result = parseIngredients('r1', [
      { name: 'Butter', quantity: 3, unit: 'teaspoons' },
    ]);

    expect(result[0].unit).toBe('tsp');
  });

  it('normalizes ingredient names', () => {
    const result = parseIngredients('r1', [
      { name: '  OLIVE  OIL  ', quantity: 2, unit: 'tbsp' },
    ]);

    expect(result[0].name).toBe('olive oil');
  });

  it('handles zero/NaN quantities gracefully', () => {
    const result = parseIngredients('r1', [
      { name: 'Salt', quantity: 0, unit: 'tsp' },
      { name: 'Pepper', quantity: NaN, unit: 'tsp' },
    ]);

    expect(result[0].quantity).toBe(0);
    expect(result[1].quantity).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// aggregateIngredients
// ---------------------------------------------------------------------------

describe('aggregateIngredients', () => {
  it('combines same ingredient with same unit', () => {
    const parsed = [
      { name: 'flour', quantity: 2, unit: 'cup', recipeId: 'r1', recipeSource: 'Pancakes' },
      { name: 'flour', quantity: 1, unit: 'cup', recipeId: 'r2', recipeSource: 'Gravy' },
    ];

    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].ingredientName).toBe('flour');
    expect(result[0].quantity).toBe(3);
    expect(result[0].unit).toBe('cup');
    expect(result[0].recipeIds).toEqual(['r1', 'r2']);
    expect(result[0].recipeSources).toEqual(['Pancakes', 'Gravy']);
  });

  it('combines same ingredient with compatible units (tsp + tbsp)', () => {
    const parsed = [
      { name: 'butter', quantity: 2, unit: 'tbsp', recipeId: 'r1', recipeSource: 'Sauce' },
      { name: 'butter', quantity: 6, unit: 'tsp', recipeId: 'r2', recipeSource: 'Baking' },
    ];

    // 2 tbsp + 6 tsp = 2 tbsp + 2 tbsp = 4 tbsp
    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].ingredientName).toBe('butter');
    expect(result[0].quantity).toBe(4);
    expect(result[0].unit).toBe('tbsp');
  });

  it('combines same ingredient with oz + lb', () => {
    const parsed = [
      { name: 'chicken', quantity: 8, unit: 'oz', recipeId: 'r1', recipeSource: 'Salad' },
      { name: 'chicken', quantity: 1, unit: 'lb', recipeId: 'r2', recipeSource: 'Soup' },
    ];

    // 8 oz + 1 lb = 8 oz + 16 oz = 24 oz = 1.5 lb
    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].ingredientName).toBe('chicken');
    expect(result[0].quantity).toBe(1.5);
    expect(result[0].unit).toBe('lb');
  });

  it('combines same ingredient with g + kg', () => {
    const parsed = [
      { name: 'flour', quantity: 500, unit: 'g', recipeId: 'r1', recipeSource: 'Bread' },
      { name: 'flour', quantity: 1, unit: 'kg', recipeId: 'r2', recipeSource: 'Cake' },
    ];

    // 500g + 1kg = 1500g = 1.5kg
    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].ingredientName).toBe('flour');
    expect(result[0].quantity).toBe(1.5);
    expect(result[0].unit).toBe('kg');
  });

  it('keeps different ingredients separate', () => {
    const parsed = [
      { name: 'flour', quantity: 2, unit: 'cup', recipeId: 'r1', recipeSource: 'A' },
      { name: 'sugar', quantity: 1, unit: 'cup', recipeId: 'r1', recipeSource: 'A' },
    ];

    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.ingredientName)).toEqual(['flour', 'sugar']);
  });

  it('auto-categorizes aggregated ingredients', () => {
    const parsed = [
      { name: 'tomato', quantity: 3, unit: 'piece', recipeId: 'r1', recipeSource: 'A' },
      { name: 'milk', quantity: 2, unit: 'cup', recipeId: 'r1', recipeSource: 'A' },
      { name: 'chicken', quantity: 1, unit: 'lb', recipeId: 'r1', recipeSource: 'A' },
    ];

    const result = aggregateIngredients(parsed);

    // Sorted by category order: produce, dairy, meat, bakery, frozen, pantry, other
    expect(result[0].ingredientName).toBe('tomato');
    expect(result[0].category).toBe('produce');
    expect(result[1].ingredientName).toBe('milk');
    expect(result[1].category).toBe('dairy');
    expect(result[2].ingredientName).toBe('chicken');
    expect(result[2].category).toBe('meat');
  });

  it('deduplicates recipe IDs and sources', () => {
    const parsed = [
      { name: 'flour', quantity: 1, unit: 'cup', recipeId: 'r1', recipeSource: 'Pancakes' },
      { name: 'flour', quantity: 1, unit: 'cup', recipeId: 'r1', recipeSource: 'Pancakes' },
      { name: 'flour', quantity: 1, unit: 'cup', recipeId: 'r2', recipeSource: 'Cake' },
    ];

    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].recipeIds).toEqual(['r1', 'r2']);
    expect(result[0].recipeSources).toEqual(['Pancakes', 'Cake']);
  });

  it('returns empty array for empty input', () => {
    expect(aggregateIngredients([])).toEqual([]);
  });

  it('handles single ingredient', () => {
    const parsed = [
      { name: 'salt', quantity: 1, unit: 'tsp', recipeId: 'r1', recipeSource: 'A' },
    ];

    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
    expect(result[0].unit).toBe('tsp');
  });

  it('sorts by category order then by name alphabetically', () => {
    const parsed = [
      { name: 'zucchini', quantity: 1, unit: 'piece', recipeId: 'r1', recipeSource: 'A' },
      { name: 'apple', quantity: 1, unit: 'piece', recipeId: 'r1', recipeSource: 'A' },
      { name: 'flour', quantity: 1, unit: 'cup', recipeId: 'r1', recipeSource: 'A' },
      { name: 'milk', quantity: 1, unit: 'cup', recipeId: 'r1', recipeSource: 'A' },
    ];

    const result = aggregateIngredients(parsed);

    const names = result.map((r) => r.ingredientName);
    // produce (apple, zucchini) before dairy (milk) before pantry (flour)
    expect(names).toEqual(['apple', 'zucchini', 'milk', 'flour']);
  });

  it('handles multi-step unit conversion (tsp → cup)', () => {
    const parsed = [
      { name: 'sugar', quantity: 24, unit: 'tsp', recipeId: 'r1', recipeSource: 'A' },
      { name: 'sugar', quantity: 1, unit: 'cup', recipeId: 'r2', recipeSource: 'B' },
    ];

    // 24 tsp = 0.5 cup; 0.5 cup + 1 cup = 1.5 cup
    const result = aggregateIngredients(parsed);

    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1.5);
    expect(result[0].unit).toBe('cup');
  });
});
