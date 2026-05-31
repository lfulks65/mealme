import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { RecipeNutrition } from '@mealme/shared';

// ── Mock Supabase ────────────────────────────────────────────────────────────

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

import { getRecipeNutrition, getRecipesByNutritionRange } from './nutrition';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeNutrition(overrides: Partial<RecipeNutrition> = {}): RecipeNutrition {
  return {
    id: 'nut-1',
    recipe_id: 'recipe-1',
    calories: 450,
    protein_g: 30,
    carbs_g: 40,
    fat_g: 15,
    fiber_g: 5,
    sugar_g: 8,
    sodium_mg: 600,
    cholesterol_mg: 85,
    serving_size: '1 bowl',
    ...overrides,
  };
}

// ── getRecipeNutrition Tests ─────────────────────────────────────────────────

describe('getRecipeNutrition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns nutrition data for a recipe', async () => {
    const nutritionData = makeNutrition();

    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({ data: nutritionData, error: null });

    const result = await getRecipeNutrition('recipe-1');

    expect(mockFrom).toHaveBeenCalledWith('recipe_nutrition');
    expect(result).toEqual(nutritionData);
    expect(result?.calories).toBe(450);
    expect(result?.protein_g).toBe(30);
  });

  it('returns null when recipe has no nutrition row', async () => {
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'not found' },
    });

    const result = await getRecipeNutrition('recipe-no-nutrition');

    expect(result).toBeNull();
  });

  it('throws on non-not-found errors', async () => {
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: '50000', message: 'internal error' },
    });

    await expect(getRecipeNutrition('recipe-1')).rejects.toEqual(
      expect.objectContaining({ code: '50000' }),
    );
  });
});

// ── getRecipesByNutritionRange Tests ──────────────────────────────────────────

describe('getRecipesByNutritionRange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries recipe_nutrition with calorie range filters', async () => {
    const nutritionRows = [
      {
        ...makeNutrition({ id: 'nut-1', recipe_id: 'r1', calories: 300 }),
        recipes: { id: 'r1', title: 'Low Cal Bowl' },
      },
      {
        ...makeNutrition({ id: 'nut-2', recipe_id: 'r2', calories: 500 }),
        recipes: { id: 'r2', title: 'High Cal Bowl' },
      },
    ];

    // Build a chainable mock
    const chain: Record<string, any> = {};
    chain.not = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: nutritionRows, error: null });
    };

    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

    const result = await getRecipesByNutritionRange({
      minCalories: 200,
      maxCalories: 600,
    });

    expect(mockFrom).toHaveBeenCalledWith('recipe_nutrition');
    expect(chain.gte).toHaveBeenCalledWith('calories', 200);
    expect(chain.lte).toHaveBeenCalledWith('calories', 600);
    expect(result).toHaveLength(2);
    expect(result[0].nutrition.calories).toBe(300);
    expect(result[0].title).toBe('Low Cal Bowl');
  });

  it('applies protein range filters', async () => {
    const chain: Record<string, any> = {};
    chain.not = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [], error: null });
    };

    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

    await getRecipesByNutritionRange({
      minProtein: 20,
      maxProtein: 50,
    });

    expect(chain.gte).toHaveBeenCalledWith('protein_g', 20);
    expect(chain.lte).toHaveBeenCalledWith('protein_g', 50);
  });

  it('applies carbs and fat range filters', async () => {
    const chain: Record<string, any> = {};
    chain.not = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [], error: null });
    };

    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

    await getRecipesByNutritionRange({
      minCarbs: 10,
      maxCarbs: 60,
      minFat: 5,
      maxFat: 30,
    });

    expect(chain.gte).toHaveBeenCalledWith('carbs_g', 10);
    expect(chain.lte).toHaveBeenCalledWith('carbs_g', 60);
    expect(chain.gte).toHaveBeenCalledWith('fat_g', 5);
    expect(chain.lte).toHaveBeenCalledWith('fat_g', 30);
  });

  it('returns empty array when no recipes match', async () => {
    const chain: Record<string, any> = {};
    chain.not = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [], error: null });
    };

    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

    const result = await getRecipesByNutritionRange({ maxCalories: 100 });

    expect(result).toEqual([]);
  });

  it('throws on database error', async () => {
    const chain: Record<string, any> = {};
    chain.not = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: null, error: { message: 'db error' } });
    };

    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

    await expect(getRecipesByNutritionRange({ minCalories: 0 })).rejects.toEqual(
      expect.objectContaining({ message: 'db error' }),
    );
  });

  it('respects limit and offset', async () => {
    const chain: Record<string, any> = {};
    chain.not = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [], error: null });
    };

    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

    await getRecipesByNutritionRange({}, 10, 20);

    expect(chain.range).toHaveBeenCalledWith(20, 29);
  });

  it('orders by calories ascending', async () => {
    const chain: Record<string, any> = {};
    chain.not = vi.fn(() => chain);
    chain.gte = vi.fn(() => chain);
    chain.lte = vi.fn(() => chain);
    chain.range = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.then = (resolve: (v: unknown) => void) => {
      resolve({ data: [], error: null });
    };

    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });

    await getRecipesByNutritionRange({});

    expect(chain.order).toHaveBeenCalledWith('calories', { ascending: true });
  });
});
