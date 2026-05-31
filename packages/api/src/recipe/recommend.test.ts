import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecipeFull, FamilyPreferences } from '@mealme/shared';

// ── Mock Supabase ────────────────────────────────────────────────────────────

// Mock the supabase client to avoid needing env vars / a real database.
// vi.mock() is hoisted by Vitest so it runs before the static import below.
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

const mockClient = {
  from: mockFrom,
};

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => mockClient,
  resetSupabaseClient: vi.fn(),
}));

// Chain: .from('table').select('*').eq('col', val).single()
mockFrom.mockReturnValue({ select: mockSelect });
mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });

import {
  scoreRecipe,
  passesDietaryFilter,
  passesAllergenFilter,
  passesBudgetFilter,
  applyHardFilters,
  getAggregatedFamilyPreferences,
} from './recommend';

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
      {
        id: 'i1',
        recipe_id: 'recipe-1',
        name: 'chicken breast',
        quantity: '1',
        unit: 'lb',
        optional: false,
      },
      {
        id: 'i2',
        recipe_id: 'recipe-1',
        name: 'soy sauce',
        quantity: '2',
        unit: 'tbsp',
        optional: false,
      },
      {
        id: 'i3',
        recipe_id: 'recipe-1',
        name: 'bell pepper',
        quantity: '1',
        unit: 'whole',
        optional: false,
      },
    ],
    instructions: [
      {
        id: 's1',
        recipe_id: 'recipe-1',
        step_number: 1,
        instruction: 'Cut chicken',
        timer_minutes: null,
      },
      {
        id: 's2',
        recipe_id: 'recipe-1',
        step_number: 2,
        instruction: 'Cook chicken',
        timer_minutes: 10,
      },
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

function makePreferences(overrides: Partial<FamilyPreferences> = {}): FamilyPreferences {
  return {
    id: '',
    familyId: 'family-1',
    dietaryRestrictions: [],
    allergies: [],
    cuisinePreferences: [],
    budgetRange: { min: 0, max: 500, currency: 'USD' },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── scoreRecipe Tests ────────────────────────────────────────────────────────

describe('scoreRecipe', () => {
  it('gives +20 bonus for each matched dietary restriction', () => {
    const recipe = makeRecipe();
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.dietaryScore).toBe(20);
    expect(result.reasons).toContainEqual(expect.stringContaining('Matches dietary needs'));
  });

  it('gives +40 bonus when two dietary restrictions match', () => {
    const recipe = makeRecipe();
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree', 'dairyFree'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.dietaryScore).toBe(40);
  });

  it('gives zero dietary score when no restrictions match', () => {
    const recipe = makeRecipe({
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: true },
      ],
    });
    const prefs = makePreferences({
      dietaryRestrictions: ['vegan'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.dietaryScore).toBe(0);
  });

  it('gives a cuisine bonus for preferred cuisines', () => {
    const recipe = makeRecipe({ cuisine: 'italian' });
    const prefs = makePreferences({
      cuisinePreferences: ['italian', 'mexican'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.cuisineScore).toBe(15);
    expect(result.reasons).toContainEqual(expect.stringContaining('Preferred cuisine: italian'));
  });

  it('does not give cuisine bonus when cuisine does not match', () => {
    const recipe = makeRecipe({ cuisine: 'chinese' });
    const prefs = makePreferences({
      cuisinePreferences: ['italian'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.cuisineScore).toBe(0);
  });

  it('performs case-insensitive cuisine matching', () => {
    const recipe = makeRecipe({ cuisine: 'Italian' });
    const prefs = makePreferences({
      cuisinePreferences: ['italian'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.cuisineScore).toBe(15);
  });

  it('gives tag bonus for tags matching dietary restrictions', () => {
    const recipe = makeRecipe({
      tags: [{ id: 't1', recipe_id: 'recipe-1', tag: 'gluten-free' }],
    });
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
    });

    const result = scoreRecipe(recipe, prefs);

    expect(result.tagScore).toBe(5);
  });

  it('gives quick meal bonus for recipes under 30 min total', () => {
    const recipe = makeRecipe({
      prep_minutes: 10,
      cook_minutes: 15,
    });
    const prefs = makePreferences();

    const result = scoreRecipe(recipe, prefs);

    expect(result.quickMealScore).toBe(5);
    expect(result.reasons).toContainEqual(expect.stringContaining('Quick meal'));
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

  it('returns zero score for a recipe with no matching preferences', () => {
    const recipe = makeRecipe();
    const prefs = makePreferences();

    const result = scoreRecipe(recipe, prefs);

    expect(result.total).toBe(0);
  });

  it('computes correct total from all scoring components', () => {
    const recipe = makeRecipe({
      cuisine: 'italian',
      prep_minutes: 10,
      cook_minutes: 15,
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'recipe-1',
          name: 'pasta',
          quantity: '1',
          unit: 'lb',
          optional: false,
        },
      ],
      tags: [{ id: 't1', recipe_id: 'recipe-1', tag: 'gluten-free' }],
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: true },
      ],
    });
    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
      cuisinePreferences: ['italian'],
      allergies: [],
    });

    const result = scoreRecipe(recipe, prefs);

    // dietary: 20, cuisine: 15, tag: 5, quick: 5 = 45
    expect(result.dietaryScore).toBe(20);
    expect(result.cuisineScore).toBe(15);
    expect(result.tagScore).toBe(5);
    expect(result.quickMealScore).toBe(5);
    expect(result.total).toBe(45);
  });

  it('does not include allergenScore in the result', () => {
    const recipe = makeRecipe();
    const prefs = makePreferences();

    const result = scoreRecipe(recipe, prefs);

    // After refactor, allergen scoring is handled by hard filters, not scoreRecipe
    expect(result).not.toHaveProperty('allergenScore');
  });
});

// ── passesDietaryFilter Tests ────────────────────────────────────────────────

describe('passesDietaryFilter', () => {
  it('returns true when no restrictions', () => {
    const recipe = makeRecipe();

    expect(passesDietaryFilter(recipe, [])).toBe(true);
  });

  it('returns true when all restrictions are compliant', () => {
    const recipe = makeRecipe({
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: true },
        { id: 'd2', recipe_id: 'recipe-1', restriction: 'dairy-free', is_compliant: true },
      ],
    });

    expect(passesDietaryFilter(recipe, ['glutenFree', 'dairyFree'])).toBe(true);
  });

  it('returns false when a restriction is not compliant', () => {
    const recipe = makeRecipe({
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: false },
      ],
    });

    expect(passesDietaryFilter(recipe, ['glutenFree'])).toBe(false);
  });

  it('returns false when a restriction is missing from dietary_info', () => {
    const recipe = makeRecipe({
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'dairy-free', is_compliant: true },
      ],
    });

    // Recipe has no entry for 'gluten-free' at all
    expect(passesDietaryFilter(recipe, ['glutenFree'])).toBe(false);
  });

  it('handles kebab-case matching (glutenFree → gluten-free)', () => {
    const recipe = makeRecipe({
      dietary_info: [
        { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: true },
      ],
    });

    // 'glutenFree' (camelCase) should match 'gluten-free' (kebab-case)
    expect(passesDietaryFilter(recipe, ['glutenFree'])).toBe(true);
  });
});

// ── passesAllergenFilter Tests ────────────────────────────────────────────────

describe('passesAllergenFilter', () => {
  it('returns true when no allergies', () => {
    const recipe = makeRecipe();

    expect(passesAllergenFilter(recipe, [])).toBe(true);
  });

  it('returns true when no ingredients match allergies', () => {
    const recipe = makeRecipe({
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'recipe-1',
          name: 'chicken breast',
          quantity: '1',
          unit: 'lb',
          optional: false,
        },
      ],
    });

    expect(passesAllergenFilter(recipe, ['peanuts'])).toBe(true);
  });

  it('returns false when an ingredient contains an allergen', () => {
    const recipe = makeRecipe({
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'recipe-1',
          name: 'peanuts',
          quantity: '2',
          unit: 'tbsp',
          optional: false,
        },
      ],
    });

    expect(passesAllergenFilter(recipe, ['peanuts'])).toBe(false);
  });

  it('performs case-insensitive matching', () => {
    const recipe = makeRecipe({
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'recipe-1',
          name: 'Peanuts',
          quantity: '2',
          unit: 'tbsp',
          optional: false,
        },
      ],
    });

    expect(passesAllergenFilter(recipe, ['peanuts'])).toBe(false);
  });

  it('detects multiple allergens', () => {
    const recipe = makeRecipe({
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'recipe-1',
          name: 'peanuts',
          quantity: '1',
          unit: 'tbsp',
          optional: false,
        },
        {
          id: 'i2',
          recipe_id: 'recipe-1',
          name: 'dairy milk',
          quantity: '1',
          unit: 'cup',
          optional: false,
        },
      ],
    });

    // Fails because peanuts is an allergen
    expect(passesAllergenFilter(recipe, ['peanuts', 'dairy'])).toBe(false);
  });

  it('detects allergen as substring of ingredient name', () => {
    const recipe = makeRecipe({
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'recipe-1',
          name: 'sesame oil',
          quantity: '1',
          unit: 'tbsp',
          optional: false,
        },
      ],
    });

    // 'sesame' is a substring of 'sesame oil'
    expect(passesAllergenFilter(recipe, ['sesame'])).toBe(false);
  });
});

// ── passesBudgetFilter Tests ─────────────────────────────────────────────────

describe('passesBudgetFilter', () => {
  it('returns true when budget max is 0 (no budget)', () => {
    const recipe = makeRecipe();

    expect(passesBudgetFilter(recipe, { min: 0, max: 0, currency: 'USD' })).toBe(true);
  });

  it('returns true when estimated cost is within range', () => {
    // 3 ingredients × 3 + 15 prep × 0.5 + 20 cook × 0.5 = 9 + 7.5 + 10 = 26.5
    const recipe = makeRecipe();

    expect(passesBudgetFilter(recipe, { min: 10, max: 50, currency: 'USD' })).toBe(true);
  });

  it('returns false when estimated cost exceeds budget max', () => {
    // 3 ingredients × 3 + 15 prep × 0.5 + 20 cook × 0.5 = 26.5
    const recipe = makeRecipe();

    expect(passesBudgetFilter(recipe, { min: 0, max: 20, currency: 'USD' })).toBe(false);
  });

  it('returns false when estimated cost is below budget min', () => {
    // 3 ingredients × 3 + 15 prep × 0.5 + 20 cook × 0.5 = 26.5
    const recipe = makeRecipe();

    expect(passesBudgetFilter(recipe, { min: 50, max: 200, currency: 'USD' })).toBe(false);
  });
});

// ── applyHardFilters Tests ───────────────────────────────────────────────────

describe('applyHardFilters', () => {
  it('returns all recipes when no preferences are set', () => {
    const recipes = [makeRecipe({ id: 'r1' }), makeRecipe({ id: 'r2' })];
    const prefs = makePreferences({
      dietaryRestrictions: [],
      allergies: [],
      budgetRange: { min: 0, max: 0, currency: 'USD' },
    });

    const result = applyHardFilters(recipes, prefs);

    expect(result.eligible).toHaveLength(2);
    expect(result.excluded).toHaveLength(0);
  });

  it('excludes recipes with allergens', () => {
    const safeRecipe = makeRecipe({ id: 'safe' });
    const unsafeRecipe = makeRecipe({
      id: 'unsafe',
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'unsafe',
          name: 'peanuts',
          quantity: '2',
          unit: 'tbsp',
          optional: false,
        },
      ],
    });

    const prefs = makePreferences({ allergies: ['peanuts'] });

    const result = applyHardFilters([safeRecipe, unsafeRecipe], prefs);

    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].id).toBe('safe');
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].recipe.id).toBe('unsafe');
    expect(result.excluded[0].reason).toContain('allergens');
  });

  it('excludes recipes that fail dietary filter', () => {
    const compliantRecipe = makeRecipe({
      id: 'compliant',
      dietary_info: [
        { id: 'd1', recipe_id: 'compliant', restriction: 'gluten-free', is_compliant: true },
      ],
    });
    const nonCompliantRecipe = makeRecipe({
      id: 'non-compliant',
      dietary_info: [
        { id: 'd1', recipe_id: 'non-compliant', restriction: 'gluten-free', is_compliant: false },
      ],
    });

    const prefs = makePreferences({ dietaryRestrictions: ['glutenFree'] });

    const result = applyHardFilters([compliantRecipe, nonCompliantRecipe], prefs);

    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].id).toBe('compliant');
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].reason).toContain('dietary');
  });

  it('excludes recipes over budget', () => {
    // 3 ingredients × 3 + 15 × 0.5 + 20 × 0.5 = 26.5
    const affordableRecipe = makeRecipe({ id: 'affordable' });
    const expensiveRecipe = makeRecipe({
      id: 'expensive',
      prep_minutes: 100,
      cook_minutes: 100,
      ingredients: Array.from({ length: 20 }, (_, i) => ({
        id: `i${i}`,
        recipe_id: 'expensive',
        name: `ingredient ${i}`,
        quantity: '1',
        unit: 'cup',
        optional: false,
      })),
    });

    const prefs = makePreferences({
      budgetRange: { min: 0, max: 30, currency: 'USD' },
    });

    const result = applyHardFilters([affordableRecipe, expensiveRecipe], prefs);

    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].id).toBe('affordable');
    expect(result.excluded).toHaveLength(1);
    expect(result.excluded[0].reason).toContain('budget');
  });

  it('includes exclusion reasons', () => {
    const recipe = makeRecipe({
      id: 'bad-recipe',
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'bad-recipe',
          name: 'peanuts',
          quantity: '2',
          unit: 'tbsp',
          optional: false,
        },
      ],
      dietary_info: [
        { id: 'd1', recipe_id: 'bad-recipe', restriction: 'gluten-free', is_compliant: false },
      ],
    });

    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
      allergies: ['peanuts'],
      budgetRange: { min: 0, max: 0, currency: 'USD' },
    });

    const result = applyHardFilters([recipe], prefs);

    expect(result.excluded).toHaveLength(1);
    const reason = result.excluded[0].reason;
    expect(reason).toContain('dietary');
    expect(reason).toContain('allergens');
  });

  it('passes recipes that meet all criteria', () => {
    const recipe = makeRecipe({
      id: 'good-recipe',
      dietary_info: [
        { id: 'd1', recipe_id: 'good-recipe', restriction: 'gluten-free', is_compliant: true },
      ],
      ingredients: [
        {
          id: 'i1',
          recipe_id: 'good-recipe',
          name: 'rice',
          quantity: '1',
          unit: 'cup',
          optional: false,
        },
      ],
    });

    const prefs = makePreferences({
      dietaryRestrictions: ['glutenFree'],
      allergies: ['peanuts'],
      budgetRange: { min: 0, max: 50, currency: 'USD' },
    });

    const result = applyHardFilters([recipe], prefs);

    expect(result.eligible).toHaveLength(1);
    expect(result.eligible[0].id).toBe('good-recipe');
    expect(result.excluded).toHaveLength(0);
  });
});

// ── getAggregatedFamilyPreferences Tests ──────────────────────────────────────

describe('getAggregatedFamilyPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock chain
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it('returns empty defaults when family preferences not found', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'not found' } });

    const result = await getAggregatedFamilyPreferences('family-1');

    expect(result.familyId).toBe('family-1');
    expect(result.dietaryRestrictions).toEqual([]);
    expect(result.allergies).toEqual([]);
    expect(result.cuisinePreferences).toEqual([]);
  });

  it('falls back to family-only when no member data', async () => {
    // First call: family_preferences
    const familySingle = vi.fn().mockResolvedValue({
      data: {
        id: 'fp-1',
        dietary_restrictions: ['glutenFree'],
        allergies: ['peanuts'],
        cuisine_preferences: ['italian'],
        budget_range: { min: 0, max: 500, currency: 'USD' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    });

    // Second call: family_members
    const memberEq = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    const memberSelect = vi.fn().mockReturnValue({ eq: memberEq });
    const memberFrom = vi.fn().mockReturnValue({ select: memberSelect });

    const familyEq = vi.fn().mockReturnValue({ single: familySingle });
    const familySelect = vi.fn().mockReturnValue({ eq: familyEq });
    const familyFrom = vi.fn().mockReturnValue({ select: familySelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'family_preferences') return familyFrom();
      if (table === 'family_members') return memberFrom();
      return { select: mockSelect };
    });

    const result = await getAggregatedFamilyPreferences('family-1');

    expect(result.dietaryRestrictions).toEqual(['glutenFree']);
    expect(result.allergies).toEqual(['peanuts']);
    expect(result.cuisinePreferences).toEqual(['italian']);
  });

  it('merges member dietary restrictions with family (union)', async () => {
    // Family preferences
    const familySingle = vi.fn().mockResolvedValue({
      data: {
        id: 'fp-1',
        dietary_restrictions: ['glutenFree'],
        allergies: ['peanuts'],
        cuisine_preferences: ['italian'],
        budget_range: { min: 0, max: 500, currency: 'USD' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    });

    // Member data with additional dietary restriction
    const memberEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'fm-1',
          member_preferences: [
            {
              dietary_restrictions: ['vegan'],
              allergies: ['soy'],
              cuisine_preferences: ['mexican'],
            },
          ],
        },
      ],
      error: null,
    });

    const memberSelect = vi.fn().mockReturnValue({ eq: memberEq });
    const memberFrom = vi.fn().mockReturnValue({ select: memberSelect });

    const familyEq = vi.fn().mockReturnValue({ single: familySingle });
    const familySelect = vi.fn().mockReturnValue({ eq: familyEq });
    const familyFrom = vi.fn().mockReturnValue({ select: familySelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'family_preferences') return familyFrom();
      if (table === 'family_members') return memberFrom();
      return { select: mockSelect };
    });

    const result = await getAggregatedFamilyPreferences('family-1');

    // Family has glutenFree, member adds vegan → union
    expect(result.dietaryRestrictions).toContain('glutenFree');
    expect(result.dietaryRestrictions).toContain('vegan');
  });

  it('merges member allergies with family (union)', async () => {
    const familySingle = vi.fn().mockResolvedValue({
      data: {
        id: 'fp-1',
        dietary_restrictions: [],
        allergies: ['peanuts'],
        cuisine_preferences: [],
        budget_range: { min: 0, max: 500, currency: 'USD' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    });

    const memberEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'fm-1',
          member_preferences: [
            {
              dietary_restrictions: [],
              allergies: ['soy'],
              cuisine_preferences: [],
            },
          ],
        },
      ],
      error: null,
    });

    const memberSelect = vi.fn().mockReturnValue({ eq: memberEq });
    const memberFrom = vi.fn().mockReturnValue({ select: memberSelect });

    const familyEq = vi.fn().mockReturnValue({ single: familySingle });
    const familySelect = vi.fn().mockReturnValue({ eq: familyEq });
    const familyFrom = vi.fn().mockReturnValue({ select: familySelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'family_preferences') return familyFrom();
      if (table === 'family_members') return memberFrom();
      return { select: mockSelect };
    });

    const result = await getAggregatedFamilyPreferences('family-1');

    expect(result.allergies).toContain('peanuts');
    expect(result.allergies).toContain('soy');
  });

  it('merges cuisine preferences with family first', async () => {
    const familySingle = vi.fn().mockResolvedValue({
      data: {
        id: 'fp-1',
        dietary_restrictions: [],
        allergies: [],
        cuisine_preferences: ['italian'],
        budget_range: { min: 0, max: 500, currency: 'USD' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    });

    const memberEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'fm-1',
          member_preferences: [
            {
              dietary_restrictions: [],
              allergies: [],
              cuisine_preferences: ['mexican', 'italian'],
            },
          ],
        },
      ],
      error: null,
    });

    const memberSelect = vi.fn().mockReturnValue({ eq: memberEq });
    const memberFrom = vi.fn().mockReturnValue({ select: memberSelect });

    const familyEq = vi.fn().mockReturnValue({ single: familySingle });
    const familySelect = vi.fn().mockReturnValue({ eq: familyEq });
    const familyFrom = vi.fn().mockReturnValue({ select: familySelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'family_preferences') return familyFrom();
      if (table === 'family_members') return memberFrom();
      return { select: mockSelect };
    });

    const result = await getAggregatedFamilyPreferences('family-1');

    // Family 'italian' comes first, then member 'mexican' (deduplicated 'italian')
    expect(result.cuisinePreferences[0]).toBe('italian');
    expect(result.cuisinePreferences).toContain('mexican');
    // No duplicates
    const italianCount = result.cuisinePreferences.filter((c) => c === 'italian').length;
    expect(italianCount).toBe(1);
  });

  it('uses family budget range (not member)', async () => {
    const familySingle = vi.fn().mockResolvedValue({
      data: {
        id: 'fp-1',
        dietary_restrictions: [],
        allergies: [],
        cuisine_preferences: [],
        budget_range: { min: 50, max: 200, currency: 'USD' },
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      },
      error: null,
    });

    const memberEq = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'fm-1',
          member_preferences: [
            {
              dietary_restrictions: [],
              allergies: [],
              cuisine_preferences: [],
            },
          ],
        },
      ],
      error: null,
    });

    const memberSelect = vi.fn().mockReturnValue({ eq: memberEq });
    const memberFrom = vi.fn().mockReturnValue({ select: memberSelect });

    const familyEq = vi.fn().mockReturnValue({ single: familySingle });
    const familySelect = vi.fn().mockReturnValue({ eq: familyEq });
    const familyFrom = vi.fn().mockReturnValue({ select: familySelect });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'family_preferences') return familyFrom();
      if (table === 'family_members') return memberFrom();
      return { select: mockSelect };
    });

    const result = await getAggregatedFamilyPreferences('family-1');

    expect(result.budgetRange).toEqual({ min: 50, max: 200, currency: 'USD' });
  });
});
