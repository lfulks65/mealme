import { describe, it, expect, vi } from 'vitest';
import type { RecipeFull, FamilyPreferences } from '@mealme/shared';

// ── Mock Supabase ────────────────────────────────────────────────────────────

// Mock the supabase client to avoid needing env vars / a real database.
// vi.mock() is hoisted by Vitest so it runs before the static import below.
const mockClient = {
  from: vi.fn(),
};

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => mockClient,
  resetSupabaseClient: vi.fn(),
}));

import { scoreRecipe } from './recommend';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeRecipe(overrides: Partial<RecipeFull> = {}): RecipeFull {
  return {
    id: 'recipe-1',
    title: 'Chicken Stir Fry',
    description: 'A delicious stir fry',
    cuisine: 'chinese',
    image_url: null,
    prep_minutes: 15,
    cook_minutes: 20,
    servings: 4,
    calories: null,
    source_url: null,
    created_by: null,
    created_at: '2025-01-01T00:00:00Z',
    ingredients: [
      { id: 'i1', recipe_id: 'recipe-1', name: 'chicken breast', quantity: '1', unit: 'lb', optional: false },
      { id: 'i2', recipe_id: 'recipe-1', name: 'soy sauce', quantity: '2', unit: 'tbsp', optional: false },
      { id: 'i3', recipe_id: 'recipe-1', name: 'bell pepper', quantity: '1', unit: 'whole', optional: false },
    ],
    instructions: [
      { id: 's1', recipe_id: 'recipe-1', step_number: 1, instruction: 'Cut chicken', timer_minutes: null },
      { id: 's2', recipe_id: 'recipe-1', step_number: 2, instruction: 'Cook chicken', timer_minutes: 10 },
    ],
    tags: [
      { id: 't1', recipe_id: 'recipe-1', tag: 'gluten-free' },
      { id: 't2', recipe_id: 'recipe-1', tag: 'quick' },
    ],
    dietary_info: [
      { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: true },
      { id: 'd2', recipe_id: 'recipe-1', restriction: 'dairy-free', is_compliant: true },
    ],
    ...overrides,
  };
}

function makePreferences(
  overrides: Partial<FamilyPreferences> = {}
): FamilyPreferences {
  return {
    familyId: 'family-1',
    dietaryRestrictions: [],
    preferredCuisines: [],
    budgetTier: 'moderate',
    maxServingsPerMeal: 4,
    activeMealSlots: [],
    includeLibraryRecipes: true,
    excludedIngredients: [],
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── scoreRecipe Tests ────────────────────────────────────────────────────────

describe('scoreRecipe', () => {
  it('gives a positive score to a recipe matching dietary restrictions', () => {
    const recipe = makeRecipe();
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.total).toBeGreaterThan(0);
    expect(result.reasons).toContainEqual(
      expect.stringContaining('Matches dietary needs')
    );
  });

  it('penalizes recipes that do not comply with required dietary restrictions', () => {
    const recipe = makeRecipe({
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: false },
      ],
    });
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.total).toBeLessThan(0);
    expect(result.reasons).toContainEqual(
      expect.stringContaining('Does not meet')
    );
  });

  it('gives a cuisine bonus for preferred cuisines', () => {
    const recipe = makeRecipe({ cuisine: 'italian' });
    const prefs = makePreferences({
      preferredCuisines: ['italian', 'mexican'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.cuisineScore).toBe(15);
    expect(result.reasons).toContainEqual(
      expect.stringContaining('Preferred cuisine: italian')
    );
  });

  it('does not give cuisine bonus when cuisine does not match', () => {
    const recipe = makeRecipe({ cuisine: 'chinese' });
    const prefs = makePreferences({
      preferredCuisines: ['italian'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.cuisineScore).toBe(0);
  });

  it('penalizes recipes containing allergens', () => {
    const recipe = makeRecipe({
      ingredients: [
        { id: 'i1', recipe_id: 'recipe-1', name: 'peanut butter', quantity: '2', unit: 'tbsp', optional: false },
      ],
    });
    const prefs = makePreferences({
      excludedIngredients: ['peanut'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.allergenScore).toBe(-50);
    expect(result.reasons).toContainEqual(
      expect.stringContaining('Contains excluded ingredients: peanut')
    );
  });

  it('does not penalize when no allergens are found', () => {
    const recipe = makeRecipe({
      ingredients: [
        { id: 'i1', recipe_id: 'recipe-1', name: 'chicken', quantity: '1', unit: 'lb', optional: false },
      ],
    });
    const prefs = makePreferences({
      excludedIngredients: ['peanut'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.allergenScore).toBe(0);
    expect(result.reasons).toContain('No allergens detected');
  });

  it('penalizes excluded ingredients', () => {
    const recipe = makeRecipe({
      ingredients: [
        { id: 'i1', recipe_id: 'recipe-1', name: 'cilantro', quantity: '1', unit: 'cup', optional: false },
      ],
    });
    const prefs = makePreferences({
      excludedIngredients: ['cilantro'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.total).toBeLessThan(0);
    expect(result.reasons).toContainEqual(
      expect.stringContaining('Contains excluded ingredients')
    );
  });

  it('gives quick meal bonus for recipes under 30 min total', () => {
    const recipe = makeRecipe({
      prep_minutes: 10,
      cook_minutes: 15,
    });
    const prefs = makePreferences();

    const result = scoreRecipe(recipe, prefs);

    expect(result.quickMealScore).toBe(5);
    expect(result.reasons).toContainEqual(
      expect.stringContaining('Quick meal')
    );
  });

  it('does not give quick meal bonus for long recipes', () => {
    const recipe = makeRecipe({
      prep_minutes: 30,
      cook_minutes: 45,
    });
    const prefs = makePreferences();

    const result = scoreRecipe(recipe, prefs);

    expect(result.quickMealScore).toBe(0);
  });

  it('gives tag bonus for tags matching dietary restrictions', () => {
    const recipe = makeRecipe({
      tags: [
        { id: 't1', recipe_id: 'recipe-1', tag: 'gluten-free' },
      ],
    });
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.tagScore).toBe(5);
  });

  it('returns zero score for a recipe with no matching preferences', () => {
    const recipe = makeRecipe();
    const prefs = makePreferences();

    const result = scoreRecipe(recipe, prefs);

    expect(result.total).toBe(0);
  });

  it('handles multiple allergens correctly', () => {
    const recipe = makeRecipe({
      ingredients: [
        { id: 'i1', recipe_id: 'recipe-1', name: 'peanut oil', quantity: '1', unit: 'tbsp', optional: false },
        { id: 'i2', recipe_id: 'recipe-1', name: 'milk', quantity: '1', unit: 'cup', optional: false },
      ],
    });
    const prefs = makePreferences({
      excludedIngredients: ['peanut', 'milk'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.allergenScore).toBe(-100); // 2 allergens × -50
  });

  it('performs case-insensitive allergen matching', () => {
    const recipe = makeRecipe({
      ingredients: [
        { id: 'i1', recipe_id: 'recipe-1', name: 'Peanut Butter', quantity: '2', unit: 'tbsp', optional: false },
      ],
    });
    const prefs = makePreferences({
      excludedIngredients: ['peanut'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.allergenScore).toBe(-50);
  });

  it('performs case-insensitive cuisine matching', () => {
    const recipe = makeRecipe({ cuisine: 'italian' });
    const prefs = makePreferences({
      preferredCuisines: ['italian'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.cuisineScore).toBe(15);
  });

  it('computes correct total from all scoring components', () => {
    const recipe = makeRecipe({
      cuisine: 'italian',
      prep_minutes: 10,
      cook_minutes: 15,
      ingredients: [
        { id: 'i1', recipe_id: 'recipe-1', name: 'pasta', quantity: '1', unit: 'lb', optional: false },
      ],
      tags: [
        { id: 't1', recipe_id: 'recipe-1', tag: 'gluten-free' },
      ],
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: true },
      ],
    });
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
      preferredCuisines: ['italian'],
      excludedIngredients: [],
    });

    const result = scoreRecipe(recipe, prefs);

    // dietary: 20, cuisine: 15, tag: 5, quick: 5 = 45
    expect(result.dietaryScore).toBe(20);
    expect(result.cuisineScore).toBe(15);
    expect(result.tagScore).toBe(5);
    expect(result.quickMealScore).toBe(5);
    expect(result.total).toBe(45);
  });
});
