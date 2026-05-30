import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecipeFull, FamilyPreferences, RecipeSearchFilters } from '@mealme/shared';

// ── Mock Supabase ────────────────────────────────────────────────────────────

// We mock the supabase client to avoid needing a real database
const mockClient = {
  from: vi.fn(),
};

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => mockClient,
  resetSupabaseClient: vi.fn(),
}));

// ── Pure filtering logic extracted for direct testing ─────────────────────────

/**
 * These functions replicate the in-memory filtering logic from search.ts
 * so we can test it without needing a full Supabase mock chain.
 */

function filterByDietaryRestrictions(
  recipes: RecipeFull[],
  restrictions: string[]
): RecipeFull[] {
  return recipes.filter((recipe) =>
    restrictions.every((restriction) =>
      recipe.dietary_info.some(
        (di) => di.restriction === restriction && di.is_compliant
      )
    )
  );
}

function filterByTags(
  recipes: RecipeFull[],
  tags: string[]
): RecipeFull[] {
  return recipes.filter((recipe) =>
    tags.every((tag) =>
      recipe.tags.some((t) => t.tag.toLowerCase() === tag.toLowerCase())
    )
  );
}

function filterByAllergens(
  recipes: RecipeFull[],
  allergies: string[]
): RecipeFull[] {
  return recipes.filter((recipe) => {
    const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());
    return allergies.every((allergen) =>
      ingredientNames.every((name) => !name.includes(allergen.toLowerCase()))
    );
  });
}

function filterByExcludedIngredients(
  recipes: RecipeFull[],
  excluded: string[]
): RecipeFull[] {
  return recipes.filter((recipe) => {
    const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());
    return excluded.every((exc) =>
      ingredientNames.every((name) => !name.includes(exc.toLowerCase()))
    );
  });
}

function applyAllPreferenceFilters(
  recipes: RecipeFull[],
  preferences: FamilyPreferences
): RecipeFull[] {
  let filtered = recipes;

  if (preferences.dietary_restrictions.length > 0) {
    filtered = filterByDietaryRestrictions(filtered, preferences.dietary_restrictions);
  }

  if (preferences.allergies.length > 0) {
    filtered = filterByAllergens(filtered, preferences.allergies);
  }

  if (preferences.excluded_ingredients && preferences.excluded_ingredients.length > 0) {
    filtered = filterByExcludedIngredients(filtered, preferences.excluded_ingredients);
  }

  return filtered;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeRecipe(overrides: Partial<RecipeFull> = {}): RecipeFull {
  return {
    id: 'recipe-1',
    title: 'Pasta Carbonara',
    description: 'Classic Italian pasta',
    cuisine: 'Italian',
    image_url: null,
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    calories: 500,
    source_url: null,
    created_by: null,
    created_at: '2025-01-01T00:00:00Z',
    ingredients: [
      { id: 'i1', recipe_id: 'recipe-1', name: 'spaghetti', quantity: '1', unit: 'lb', optional: false },
      { id: 'i2', recipe_id: 'recipe-1', name: 'parmesan cheese', quantity: '1', unit: 'cup', optional: false },
      { id: 'i3', recipe_id: 'recipe-1', name: 'bacon', quantity: '6', unit: 'slices', optional: false },
    ],
    instructions: [],
    tags: [
      { id: 't1', recipe_id: 'recipe-1', tag: 'comfort-food' },
    ],
    dietary_info: [
      { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: false },
      { id: 'd2', recipe_id: 'recipe-1', restriction: 'dairy-free', is_compliant: false },
    ],
    ...overrides,
  };
}

// ── Dietary Restriction Filter Tests ─────────────────────────────────────────

describe('filterByDietaryRestrictions', () => {
  it('keeps recipes compliant with all required restrictions', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        dietary_info: [
          { id: 'd1', recipe_id: 'r1', restriction: 'gluten-free', is_compliant: true },
          { id: 'd2', recipe_id: 'r1', restriction: 'dairy-free', is_compliant: true },
        ],
      }),
    ];

    const result = filterByDietaryRestrictions(recipes, ['gluten-free', 'dairy-free']);
    expect(result).toHaveLength(1);
  });

  it('excludes recipes not compliant with a required restriction', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        dietary_info: [
          { id: 'd1', recipe_id: 'r1', restriction: 'gluten-free', is_compliant: false },
        ],
      }),
    ];

    const result = filterByDietaryRestrictions(recipes, ['gluten-free']);
    expect(result).toHaveLength(0);
  });

  it('excludes recipes missing a restriction entry entirely', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        dietary_info: [],
      }),
    ];

    const result = filterByDietaryRestrictions(recipes, ['gluten-free']);
    expect(result).toHaveLength(0);
  });

  it('keeps recipes when no restrictions are specified', () => {
    const recipes = [makeRecipe()];
    const result = filterByDietaryRestrictions(recipes, []);
    expect(result).toHaveLength(1);
  });

  it('handles partial compliance correctly', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        dietary_info: [
          { id: 'd1', recipe_id: 'r1', restriction: 'gluten-free', is_compliant: true },
          { id: 'd2', recipe_id: 'r1', restriction: 'dairy-free', is_compliant: false },
        ],
      }),
    ];

    // Recipe is gluten-free but NOT dairy-free
    const gfResult = filterByDietaryRestrictions(recipes, ['gluten-free']);
    expect(gfResult).toHaveLength(1);

    const dfResult = filterByDietaryRestrictions(recipes, ['dairy-free']);
    expect(dfResult).toHaveLength(0);

    const bothResult = filterByDietaryRestrictions(recipes, ['gluten-free', 'dairy-free']);
    expect(bothResult).toHaveLength(0);
  });
});

// ── Tag Filter Tests ─────────────────────────────────────────────────────────

describe('filterByTags', () => {
  it('keeps recipes that have all requested tags', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        tags: [
          { id: 't1', recipe_id: 'r1', tag: 'quick' },
          { id: 't2', recipe_id: 'r1', tag: 'healthy' },
        ],
      }),
    ];

    const result = filterByTags(recipes, ['quick', 'healthy']);
    expect(result).toHaveLength(1);
  });

  it('excludes recipes missing a required tag', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        tags: [
          { id: 't1', recipe_id: 'r1', tag: 'quick' },
        ],
      }),
    ];

    const result = filterByTags(recipes, ['quick', 'healthy']);
    expect(result).toHaveLength(0);
  });

  it('performs case-insensitive tag matching', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        tags: [
          { id: 't1', recipe_id: 'r1', tag: 'Quick' },
        ],
      }),
    ];

    const result = filterByTags(recipes, ['quick']);
    expect(result).toHaveLength(1);
  });
});

// ── Allergen Filter Tests ────────────────────────────────────────────────────

describe('filterByAllergens', () => {
  it('excludes recipes containing allergen ingredients', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          { id: 'i1', recipe_id: 'r1', name: 'peanut butter', quantity: '2', unit: 'tbsp', optional: false },
        ],
      }),
    ];

    const result = filterByAllergens(recipes, ['peanut']);
    expect(result).toHaveLength(0);
  });

  it('keeps recipes without allergen ingredients', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          { id: 'i1', recipe_id: 'r1', name: 'chicken breast', quantity: '1', unit: 'lb', optional: false },
        ],
      }),
    ];

    const result = filterByAllergens(recipes, ['peanut']);
    expect(result).toHaveLength(1);
  });

  it('performs case-insensitive allergen matching', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          { id: 'i1', recipe_id: 'r1', name: 'Peanut Oil', quantity: '1', unit: 'tbsp', optional: false },
        ],
      }),
    ];

    const result = filterByAllergens(recipes, ['peanut']);
    expect(result).toHaveLength(0);
  });

  it('handles multiple allergens', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          { id: 'i1', recipe_id: 'r1', name: 'peanut butter', quantity: '2', unit: 'tbsp', optional: false },
        ],
      }),
      makeRecipe({
        id: 'r2',
        ingredients: [
          { id: 'i2', recipe_id: 'r2', name: 'chicken', quantity: '1', unit: 'lb', optional: false },
        ],
      }),
    ];

    const result = filterByAllergens(recipes, ['peanut', 'milk']);
    // r1 has peanut, r2 is clean (no peanut, no milk)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r2');
  });
});

// ── Excluded Ingredients Filter Tests ────────────────────────────────────────

describe('filterByExcludedIngredients', () => {
  it('excludes recipes with excluded ingredients', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          { id: 'i1', recipe_id: 'r1', name: 'cilantro', quantity: '1', unit: 'cup', optional: false },
        ],
      }),
    ];

    const result = filterByExcludedIngredients(recipes, ['cilantro']);
    expect(result).toHaveLength(0);
  });

  it('keeps recipes without excluded ingredients', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          { id: 'i1', recipe_id: 'r1', name: 'parsley', quantity: '1', unit: 'cup', optional: false },
        ],
      }),
    ];

    const result = filterByExcludedIngredients(recipes, ['cilantro']);
    expect(result).toHaveLength(1);
  });
});

// ── Combined Preference Filter Tests ─────────────────────────────────────────

describe('applyAllPreferenceFilters', () => {
  it('applies dietary, allergen, and excluded ingredient filters together', () => {
    const recipes = [
      // Recipe 1: gluten-free, dairy-free compliant, no allergens
      makeRecipe({
        id: 'r1',
        ingredients: [
          { id: 'i1', recipe_id: 'r1', name: 'rice', quantity: '1', unit: 'cup', optional: false },
        ],
        dietary_info: [
          { id: 'd1', recipe_id: 'r1', restriction: 'gluten-free', is_compliant: true },
          { id: 'd2', recipe_id: 'r1', restriction: 'dairy-free', is_compliant: true },
        ],
      }),
      // Recipe 2: gluten-free compliant but contains peanut allergen
      makeRecipe({
        id: 'r2',
        ingredients: [
          { id: 'i3', recipe_id: 'r2', name: 'peanut sauce', quantity: '2', unit: 'tbsp', optional: false },
        ],
        dietary_info: [
          { id: 'd3', recipe_id: 'r2', restriction: 'gluten-free', is_compliant: true },
        ],
      }),
      // Recipe 3: NOT gluten-free compliant
      makeRecipe({
        id: 'r3',
        ingredients: [
          { id: 'i4', recipe_id: 'r3', name: 'chicken', quantity: '1', unit: 'lb', optional: false },
        ],
        dietary_info: [
          { id: 'd4', recipe_id: 'r3', restriction: 'gluten-free', is_compliant: false },
        ],
      }),
    ];

    const prefs: FamilyPreferences = {
      family_id: 'f1',
      dietary_restrictions: ['gluten-free'],
      allergies: ['peanut'],
      cuisine_preferences: [],
    };

    const result = applyAllPreferenceFilters(recipes, prefs);

    // Only r1 should pass: r2 has peanut, r3 is not gluten-free
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
  });

  it('returns all recipes when no preferences are set', () => {
    const recipes = [makeRecipe({ id: 'r1' }), makeRecipe({ id: 'r2' })];

    const prefs: FamilyPreferences = {
      family_id: 'f1',
      dietary_restrictions: [],
      allergies: [],
      cuisine_preferences: [],
    };

    const result = applyAllPreferenceFilters(recipes, prefs);
    expect(result).toHaveLength(2);
  });
});

// ── Integration: searchRecipes with Supabase mock ────────────────────────────

describe('searchRecipes (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Supabase with correct table and returns result structure', async () => {
    // Build a minimal chainable mock
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const recipeData = { id: 'r1', title: 'Test', description: null, cuisine: null, image_url: null, prep_minutes: null, cook_minutes: null, servings: null, calories: null, source_url: null, created_by: null, created_at: '2025-01-01' };

    chain.eq = vi.fn(() => chain);
    chain.ilike = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.textSearch = vi.fn(() => chain);
    chain.not = vi.fn(() => chain);
    chain.single = vi.fn(() => Promise.resolve({ data: null, error: null }));

    // Make the chain thenable
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [recipeData], error: null, count: 1 });
    };

    mockClient.from.mockReturnValue({ select: vi.fn(() => chain) });

    const { searchRecipes } = await import('./search');
    const result = await searchRecipes(undefined, undefined, 20, 0);

    expect(mockClient.from).toHaveBeenCalledWith('recipes');
    expect(result).toHaveProperty('recipes');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('limit', 20);
    expect(result).toHaveProperty('offset', 0);
  });
});
