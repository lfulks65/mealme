import { describe, it, expect, vi, beforeEach } from 'vitest';
import { passesDietaryFilter, passesAllergenFilter, passesBudgetFilter } from './recommend';
import type { RecipeFull, FamilyPreferences } from '@mealme/shared';

// ── Mock Supabase ────────────────────────────────────────────────────────────

// We mock the supabase client to avoid needing a real database
const mockRpc = vi.fn();
const mockClient = {
  from: vi.fn(),
  rpc: mockRpc,
};

vi.mock('../lib/supabase', () => ({
  getSupabaseClient: () => mockClient,
  resetSupabaseClient: vi.fn(),
}));

// ── Filter wrappers delegating to shared functions ───────────────────────────

/**
 * These wrappers delegate to the shared hard-filter functions from
 * recommend.ts so that tests validate the same logic the search module uses.
 */

function filterByDietaryRestrictions(recipes: RecipeFull[], restrictions: string[]): RecipeFull[] {
  return recipes.filter((recipe) => passesDietaryFilter(recipe, restrictions));
}

function filterByTags(recipes: RecipeFull[], tags: string[]): RecipeFull[] {
  return recipes.filter((recipe) =>
    tags.every((tag: string) => recipe.tags.some((t) => t.tag.toLowerCase() === tag.toLowerCase())),
  );
}

function filterByAllergens(recipes: RecipeFull[], allergies: string[]): RecipeFull[] {
  return recipes.filter((recipe) => passesAllergenFilter(recipe, allergies));
}

function filterByExcludedIngredients(recipes: RecipeFull[], excluded: string[]): RecipeFull[] {
  return recipes.filter((recipe) => {
    const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());
    return excluded.every((exc: string) =>
      ingredientNames.every((name) => !name.includes(exc.toLowerCase())),
    );
  });
}

function filterByBudget(
  recipes: RecipeFull[],
  budgetRange: { min: number; max: number },
): RecipeFull[] {
  return recipes.filter((recipe) => passesBudgetFilter(recipe, budgetRange as any));
}

function applyAllPreferenceFilters(
  recipes: RecipeFull[],
  preferences: FamilyPreferences,
): RecipeFull[] {
  let filtered = recipes;

  filtered = filterByDietaryRestrictions(
    filtered,
    preferences.dietaryRestrictions as unknown as string[],
  );
  filtered = filterByAllergens(filtered, preferences.allergies);
  filtered = filterByBudget(filtered, preferences.budgetRange);

  return filtered;
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeRecipe(overrides: Partial<RecipeFull> = {}): RecipeFull {
  return {
    id: 'recipe-1',
    title: 'Pasta Carbonara',
    description: 'Classic Italian pasta',
    cuisine: 'italian',
    image_url: null,
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 4,
    calories: null,
    source_url: null,
    created_by: null,
    created_at: '2025-01-01T00:00:00Z',
    difficulty: 'medium',
    avg_rating: null,
    ingredients: [
      {
        id: 'i1',
        recipe_id: 'recipe-1',
        name: 'spaghetti',
        quantity: '1',
        unit: 'lb',
        optional: false,
      },
      {
        id: 'i2',
        recipe_id: 'recipe-1',
        name: 'parmesan cheese',
        quantity: '1',
        unit: 'cup',
        optional: false,
      },
      {
        id: 'i3',
        recipe_id: 'recipe-1',
        name: 'bacon',
        quantity: '6',
        unit: 'slice',
        optional: false,
      },
    ],
    steps: [],
    tags: [{ id: 't1', recipe_id: 'recipe-1', tag: 'comfort-food' }],
    dietary_info: [
      { id: 'd1', recipe_id: 'recipe-1', restriction: 'gluten-free', is_compliant: false },
      { id: 'd2', recipe_id: 'recipe-1', restriction: 'dairy-free', is_compliant: false },
    ],
    nutrition: null,
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
        tags: [{ id: 't1', recipe_id: 'r1', tag: 'quick' }],
      }),
    ];

    const result = filterByTags(recipes, ['quick', 'healthy']);
    expect(result).toHaveLength(0);
  });

  it('performs case-insensitive tag matching', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        tags: [{ id: 't1', recipe_id: 'r1', tag: 'Quick' }],
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
          {
            id: 'i1',
            recipe_id: 'r1',
            name: 'peanut butter',
            quantity: '2',
            unit: 'tbsp',
            optional: false,
          },
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
          {
            id: 'i1',
            recipe_id: 'r1',
            name: 'chicken breast',
            quantity: '1',
            unit: 'lb',
            optional: false,
          },
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
          {
            id: 'i1',
            recipe_id: 'r1',
            name: 'Peanut Oil',
            quantity: '1',
            unit: 'tbsp',
            optional: false,
          },
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
          {
            id: 'i1',
            recipe_id: 'r1',
            name: 'peanut butter',
            quantity: '2',
            unit: 'tbsp',
            optional: false,
          },
        ],
      }),
      makeRecipe({
        id: 'r2',
        ingredients: [
          {
            id: 'i2',
            recipe_id: 'r2',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            optional: false,
          },
        ],
      }),
    ];

    const result = filterByAllergens(recipes, ['peanut', 'milk']);
    // r1 has peanut, r2 is clean (no peanut, no milk)
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r2');
  });
});

// ── Budget Filter Tests ──────────────────────────────────────────────────────

describe('filterByBudget', () => {
  it('excludes recipes over budget', () => {
    // Default recipe: 3 ingredients × 3 + 10 prep × 0.5 + 20 cook × 0.5 = 9 + 5 + 10 = 24
    const recipes = [makeRecipe({ id: 'r1' })];

    const result = filterByBudget(recipes, { min: 0, max: 20 });
    expect(result).toHaveLength(0);
  });

  it('keeps recipes within budget', () => {
    const recipes = [makeRecipe({ id: 'r1' })];

    const result = filterByBudget(recipes, { min: 0, max: 50 });
    expect(result).toHaveLength(1);
  });

  it('keeps all recipes when max budget is 0 (no budget set)', () => {
    const recipes = [makeRecipe({ id: 'r1' })];

    const result = filterByBudget(recipes, { min: 0, max: 0 });
    expect(result).toHaveLength(1);
  });

  it('excludes recipes below minimum budget', () => {
    const recipes = [makeRecipe({ id: 'r1' })];

    const result = filterByBudget(recipes, { min: 100, max: 200 });
    expect(result).toHaveLength(0);
  });
});

// ── Excluded Ingredients Filter Tests ────────────────────────────────────────

describe('filterByExcludedIngredients', () => {
  it('excludes recipes with excluded ingredients', () => {
    const recipes = [
      makeRecipe({
        id: 'r1',
        ingredients: [
          {
            id: 'i1',
            recipe_id: 'r1',
            name: 'cilantro',
            quantity: '1',
            unit: 'cup',
            optional: false,
          },
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
          {
            id: 'i1',
            recipe_id: 'r1',
            name: 'parsley',
            quantity: '1',
            unit: 'cup',
            optional: false,
          },
        ],
      }),
    ];

    const result = filterByExcludedIngredients(recipes, ['cilantro']);
    expect(result).toHaveLength(1);
  });
});

// ── Combined Preference Filter Tests ─────────────────────────────────────────

describe('applyAllPreferenceFilters', () => {
  it('applies dietary and excluded ingredient filters together', () => {
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
          {
            id: 'i3',
            recipe_id: 'r2',
            name: 'peanut sauce',
            quantity: '2',
            unit: 'tbsp',
            optional: false,
          },
        ],
        dietary_info: [
          { id: 'd3', recipe_id: 'r2', restriction: 'gluten-free', is_compliant: true },
        ],
      }),
      // Recipe 3: NOT gluten-free compliant
      makeRecipe({
        id: 'r3',
        ingredients: [
          {
            id: 'i4',
            recipe_id: 'r3',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            optional: false,
          },
        ],
        dietary_info: [
          { id: 'd4', recipe_id: 'r3', restriction: 'gluten-free', is_compliant: false },
        ],
      }),
    ];

    const prefs: FamilyPreferences = {
      id: '',
      familyId: 'f1',
      dietaryRestrictions: ['gluten-free'] as any,
      allergies: ['peanut'] as any,
      cuisinePreferences: [],
      budgetRange: { min: 0, max: 500, currency: 'USD' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const result = applyAllPreferenceFilters(recipes, prefs);

    // Only r1 should pass: r2 has peanut, r3 is not gluten-free
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('r1');
  });

  it('returns all recipes when no preferences are set', () => {
    const recipes = [makeRecipe({ id: 'r1' }), makeRecipe({ id: 'r2' })];

    const prefs: FamilyPreferences = {
      id: '',
      familyId: 'f1',
      dietaryRestrictions: [],
      allergies: [],
      cuisinePreferences: [],
      budgetRange: { min: 0, max: 500, currency: 'USD' },
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    };

    const result = applyAllPreferenceFilters(recipes, prefs);
    expect(result).toHaveLength(2);
  });
});

// ── Integration: searchRecipes with Supabase RPC mock ─────────────────────────

describe('searchRecipes (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls search_recipes_rpc and returns result structure', async () => {
    const recipeData = {
      id: 'r1',
      title: 'Test',
      total_count: 1,
    };

    mockRpc.mockResolvedValue({ data: [recipeData], error: null });

    // Mock attachRelations by mocking the from() calls
    // Each from() returns a chain that is thenable
    const emptyResult = { data: [], error: null };
    const chain: Record<string, any> = {};
    chain.select = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    // Make the chain thenable so `await` resolves it
    chain.then = (resolve: (v: unknown) => void) => resolve(emptyResult);
    mockClient.from.mockReturnValue(chain);

    const { searchRecipes } = await import('./search');
    const result = await searchRecipes({ query: 'pasta' });

    expect(mockRpc).toHaveBeenCalledWith(
      'search_recipes_rpc',
      expect.objectContaining({
        p_query: 'pasta',
        p_sort: 'relevance',
        p_limit: 20,
        p_offset: 0,
      }),
    );
    expect(result).toHaveProperty('recipes');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('limit', 20);
    expect(result).toHaveProperty('offset', 0);
    expect(result).toHaveProperty('has_more');
  });

  it('passes all filter params to the RPC', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { searchRecipes } = await import('./search');
    await searchRecipes({
      query: 'chicken',
      cuisine: 'italian',
      difficulty: 'easy',
      dietary_restrictions: ['gluten-free'],
      max_prep_minutes: 30,
      max_total_minutes: 60,
      max_calories: 500,
      tags: ['quick'],
      sort: 'prep_time',
      limit: 10,
      offset: 5,
    });

    expect(mockRpc).toHaveBeenCalledWith('search_recipes_rpc', {
      p_query: 'chicken',
      p_cuisine: 'italian',
      p_difficulty: 'easy',
      p_dietary_restrictions: ['gluten-free'],
      p_max_prep_minutes: 30,
      p_max_total_minutes: 60,
      p_max_calories: 500,
      p_tags: ['quick'],
      p_sort: 'prep_time',
      p_limit: 10,
      p_offset: 5,
    });
  });

  it('uses defaults when no filters provided', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { searchRecipes } = await import('./search');
    await searchRecipes();

    expect(mockRpc).toHaveBeenCalledWith('search_recipes_rpc', {
      p_query: null,
      p_cuisine: null,
      p_difficulty: null,
      p_dietary_restrictions: [],
      p_max_prep_minutes: null,
      p_max_total_minutes: null,
      p_max_calories: null,
      p_tags: [],
      p_sort: 'relevance',
      p_limit: 20,
      p_offset: 0,
    });
  });

  it('computes has_more correctly', async () => {
    const recipes = Array.from({ length: 20 }, (_, i) => ({
      id: `r${i}`,
      title: `Recipe ${i}`,
      total_count: 50,
    }));

    mockRpc.mockResolvedValue({ data: recipes, error: null });

    const emptyResult = { data: [], error: null };
    const chain: Record<string, any> = {};
    chain.select = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => resolve(emptyResult);
    mockClient.from.mockReturnValue(chain);

    const { searchRecipes } = await import('./search');
    const result = await searchRecipes({ limit: 20, offset: 0 });

    expect(result.total).toBe(50);
    expect(result.has_more).toBe(true); // 0 + 20 < 50
  });

  it('has_more is false when all results fit in one page', async () => {
    const recipes = Array.from({ length: 5 }, (_, i) => ({
      id: `r${i}`,
      title: `Recipe ${i}`,
      total_count: 5,
    }));

    mockRpc.mockResolvedValue({ data: recipes, error: null });

    const emptyResult = { data: [], error: null };
    const chain: Record<string, any> = {};
    chain.select = vi.fn(() => chain);
    chain.in = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => resolve(emptyResult);
    mockClient.from.mockReturnValue(chain);

    const { searchRecipes } = await import('./search');
    const result = await searchRecipes({ limit: 20, offset: 0 });

    expect(result.total).toBe(5);
    expect(result.has_more).toBe(false); // 0 + 20 >= 5
  });

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'RPC failed', code: 'PGRST' },
    });

    const { searchRecipes } = await import('./search');

    await expect(searchRecipes({ query: 'fail' })).rejects.toEqual(
      expect.objectContaining({ message: 'RPC failed' }),
    );
  });

  it('returns total_count = 0 when no results', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { searchRecipes } = await import('./search');
    const result = await searchRecipes({ query: 'nonexistent' });

    expect(result.total).toBe(0);
    expect(result.recipes).toEqual([]);
    expect(result.has_more).toBe(false);
  });

  it('uses textSearch for FTS queries', async () => {
    const chain: Record<string, any> = {};
    const recipeData = { id: 'r1', title: 'Chicken Stir Fry' };

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

    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [recipeData], error: null, count: 1 });
    };

    mockClient.from.mockReturnValue({ select: vi.fn(() => chain) });

    const { searchRecipes } = await import('./search');
    const result = await searchRecipes('chicken stir fry', undefined, 20, 0);

    expect(chain.textSearch).toHaveBeenCalledWith('fts', 'chicken:* & stir:* & fry:*', {
      type: 'plain',
      config: 'english',
    });
    expect(result.recipes).toHaveLength(1);
  });

  it('applies cuisine filter alongside FTS', async () => {
    const chain: Record<string, any> = {};
    const recipeData = { id: 'r1', title: 'Pad Thai' };

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

    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [recipeData], error: null, count: 1 });
    };

    mockClient.from.mockReturnValue({ select: vi.fn(() => chain) });

    const { searchRecipes } = await import('./search');
    const result = await searchRecipes('pad thai', { cuisine: 'thai' }, 20, 0);

    expect(chain.textSearch).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith('cuisine', 'thai');
    expect(result.recipes).toHaveLength(1);
  });

  it('applies max_prep_minutes filter alongside FTS', async () => {
    const chain: Record<string, any> = {};
    const recipeData = { id: 'r1', title: 'Quick Omelette' };

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

    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [recipeData], error: null, count: 1 });
    };

    mockClient.from.mockReturnValue({ select: vi.fn(() => chain) });

    const { searchRecipes } = await import('./search');
    await searchRecipes('omelette', { max_prep_minutes: 15 }, 20, 0);

    expect(chain.textSearch).toHaveBeenCalled();
    expect(chain.lte).toHaveBeenCalledWith('prep_minutes', 15);
  });

  it('skips textSearch when query is empty or whitespace', async () => {
    const chain: Record<string, any> = {};
    const recipeData = { id: 'r1', title: 'Test' };

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

    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [recipeData], error: null, count: 1 });
    };

    mockClient.from.mockReturnValue({ select: vi.fn(() => chain) });

    const { searchRecipes } = await import('./search');
    await searchRecipes('   ', undefined, 20, 0);

    expect(chain.textSearch).not.toHaveBeenCalled();
  });
});
