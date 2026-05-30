/**
 * @module meal-plan/functions.test
 * Unit tests for the meal plan CRUD and AI proposal functions.
 *
 * The Supabase client and preferences module are mocked so these
 * tests run without a real database connection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the Supabase client
// ---------------------------------------------------------------------------

const mockAuthGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockAuthGetUser(),
    },
    from: (table: string) => mockFrom(table),
  },
}));

// ---------------------------------------------------------------------------
// Mock the preferences module
// ---------------------------------------------------------------------------

const mockGetAggregatedPreferences = vi.fn();

vi.mock('../preferences', () => ({
  getAggregatedPreferences: (...args: any[]) => mockGetAggregatedPreferences(...args),
}));

// ---------------------------------------------------------------------------
// Import after mocking
// ---------------------------------------------------------------------------

import {
  createMealPlan,
  getMealPlan,
  getWeeklyPlan,
  addMealEntry,
  removeMealEntry,
  updateMealEntry,
  generatePlanProposal,
} from './functions';

// ---------------------------------------------------------------------------
// Helpers to build chainable Supabase query mocks
// ---------------------------------------------------------------------------

/** Build a chainable mock where the final `.single()` resolves to the given value. */
function singleChain(data: any, error: any = null) {
  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.delete = vi.fn().mockReturnValue(c);
  c.upsert = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.overlaps = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(c);
  c.limit = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.maybeSingle = vi.fn().mockResolvedValue({ data, error });
  c.single = vi.fn().mockResolvedValue({ data, error });
  return c;
}

/** Build a chainable mock that resolves to an array. */
function arrayChain(data: any[], error: any = null) {
  const c: any = {};
  c.select = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockResolvedValue({ data, error });
  return c;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FAMILY_ID = 'fam-001';
const USER_ID = 'usr-001';
const PLAN_ID = 'plan-001';
const WEEK_START = '2025-01-13'; // Monday

const mealPlanRow = {
  id: PLAN_ID,
  family_id: FAMILY_ID,
  week_start_date: WEEK_START,
  created_by: USER_ID,
  created_at: '2025-01-12T00:00:00Z',
  status: 'draft',
};

const entryRow = {
  id: 'entry-001',
  meal_plan_id: PLAN_ID,
  date: '2025-01-13',
  meal_slot: 'breakfast',
  recipe_id: 'recipe-001',
  servings: 4,
  notes: null,
  created_at: '2025-01-12T00:00:00Z',
};

const recipeSummary = {
  id: 'recipe-001',
  title: 'Pancakes',
  description: 'Fluffy pancakes',
  prep_time_minutes: 10,
  cook_time_minutes: 15,
  servings: 4,
  difficulty: 'easy',
  image_urls: [],
  dietary_tags: ['vegetarian'],
  cuisine_type: 'american',
};

const aggregatedPrefs = {
  familyId: FAMILY_ID,
  dietaryRestrictions: ['vegetarian'],
  allergies: ['peanuts'],
  cuisinePreferences: ['italian', 'mexican'],
  budgetTier: 'moderate',
  householdSize: 4,
  notes: null,
  memberOverrides: [],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthGetUser.mockResolvedValue({
    data: { user: { id: USER_ID } },
  });
});

// ── createMealPlan ───────────────────────────────────────────────────────

describe('createMealPlan', () => {
  it('creates an empty draft meal plan for a family and week', async () => {
    const chain = singleChain(mealPlanRow);
    mockFrom.mockReturnValue(chain);

    const result = await createMealPlan(FAMILY_ID, WEEK_START);

    expect(mockFrom).toHaveBeenCalledWith('meal_plans');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: FAMILY_ID,
        week_start_date: WEEK_START,
        created_by: USER_ID,
        status: 'draft',
      }),
    );
    expect(result.mealPlan).not.toBeNull();
    expect(result.mealPlan!.id).toBe(PLAN_ID);
    expect(result.mealPlan!.entries).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await createMealPlan(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when Supabase insert fails', async () => {
    const chain = singleChain(null, { message: 'Insert failed' });
    mockFrom.mockReturnValue(chain);

    const result = await createMealPlan(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Insert failed');
  });
});

// ── getMealPlan ──────────────────────────────────────────────────────────

describe('getMealPlan', () => {
  it('fetches a meal plan with entries joined to recipes', async () => {
    const planChain = singleChain(mealPlanRow);
    const entriesChain = arrayChain([entryRow]);
    const recipeChain = singleChain(recipeSummary);

    mockFrom
      .mockReturnValueOnce(planChain)   // meal_plans select
      .mockReturnValueOnce(entriesChain) // meal_plan_entries select
      .mockReturnValueOnce(recipeChain); // recipes select

    const result = await getMealPlan(PLAN_ID);

    expect(result.mealPlan).not.toBeNull();
    expect(result.mealPlan!.id).toBe(PLAN_ID);
    expect(result.mealPlan!.entries).toHaveLength(1);
    expect(result.mealPlan!.entries[0].recipe).toEqual(recipeSummary);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getMealPlan(PLAN_ID);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when plan not found', async () => {
    const chain = singleChain(null, { message: 'Not found' });
    mockFrom.mockReturnValue(chain);

    const result = await getMealPlan(PLAN_ID);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Not found');
  });

  it('returns plan with empty entries when no entries exist', async () => {
    const planChain = singleChain(mealPlanRow);
    const entriesChain = arrayChain([]);

    mockFrom
      .mockReturnValueOnce(planChain)
      .mockReturnValueOnce(entriesChain);

    const result = await getMealPlan(PLAN_ID);

    expect(result.mealPlan).not.toBeNull();
    expect(result.mealPlan!.entries).toEqual([]);
    expect(result.error).toBeNull();
  });
});

// ── getWeeklyPlan ────────────────────────────────────────────────────────

describe('getWeeklyPlan', () => {
  it('fetches the weekly plan for a family', async () => {
    const planChain = singleChain(mealPlanRow);
    const entriesChain = arrayChain([entryRow]);
    const recipeChain = singleChain(recipeSummary);

    mockFrom
      .mockReturnValueOnce(planChain)
      .mockReturnValueOnce(entriesChain)
      .mockReturnValueOnce(recipeChain);

    const result = await getWeeklyPlan(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).not.toBeNull();
    expect(result.mealPlan!.family_id).toBe(FAMILY_ID);
    expect(result.error).toBeNull();
  });

  it('returns null mealPlan (no error) when no plan exists for the week', async () => {
    const chain = singleChain(null, { code: 'PGRST116' });
    mockFrom.mockReturnValue(chain);

    const result = await getWeeklyPlan(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getWeeklyPlan(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});

// ── addMealEntry ─────────────────────────────────────────────────────────

describe('addMealEntry', () => {
  it('adds a meal entry to a plan with default servings', async () => {
    const entryChain = singleChain(entryRow);
    const recipeChain = singleChain(recipeSummary);

    mockFrom
      .mockReturnValueOnce(entryChain)
      .mockReturnValueOnce(recipeChain);

    const result = await addMealEntry(
      PLAN_ID,
      '2025-01-13',
      'breakfast',
      'recipe-001',
    );

    expect(mockFrom).toHaveBeenCalledWith('meal_plan_entries');
    expect(entryChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        meal_plan_id: PLAN_ID,
        date: '2025-01-13',
        meal_slot: 'breakfast',
        recipe_id: 'recipe-001',
        servings: 4,
      }),
    );
    expect(result.entry).not.toBeNull();
    expect(result.entry!.recipe).toEqual(recipeSummary);
    expect(result.error).toBeNull();
  });

  it('adds a meal entry with custom servings', async () => {
    const entryChain = singleChain({ ...entryRow, servings: 6 });
    const recipeChain = singleChain(recipeSummary);

    mockFrom
      .mockReturnValueOnce(entryChain)
      .mockReturnValueOnce(recipeChain);

    const result = await addMealEntry(
      PLAN_ID,
      '2025-01-13',
      'dinner',
      'recipe-001',
      6,
    );

    expect(entryChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        servings: 6,
      }),
    );
    expect(result.entry!.servings).toBe(6);
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await addMealEntry(PLAN_ID, '2025-01-13', 'breakfast', 'recipe-001');

    expect(result.entry).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when Supabase insert fails', async () => {
    const chain = singleChain(null, { message: 'Foreign key violation' });
    mockFrom.mockReturnValue(chain);

    const result = await addMealEntry(PLAN_ID, '2025-01-13', 'breakfast', 'bad-recipe');

    expect(result.entry).toBeNull();
    expect(result.error).toBe('Foreign key violation');
  });
});

// ── removeMealEntry ──────────────────────────────────────────────────────

describe('removeMealEntry', () => {
  it('removes a meal entry by ID', async () => {
    const chain = singleChain(null);
    chain.eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(chain);

    const result = await removeMealEntry('entry-001');

    expect(mockFrom).toHaveBeenCalledWith('meal_plan_entries');
    expect(chain.delete).toHaveBeenCalled();
    expect(result.entryId).toBe('entry-001');
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await removeMealEntry('entry-001');

    expect(result.entryId).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when Supabase delete fails', async () => {
    const chain = singleChain(null);
    chain.eq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    mockFrom.mockReturnValue(chain);

    const result = await removeMealEntry('entry-001');

    expect(result.entryId).toBeNull();
    expect(result.error).toBe('Delete failed');
  });
});

// ── updateMealEntry ──────────────────────────────────────────────────────

describe('updateMealEntry', () => {
  it('updates specified fields of a meal entry', async () => {
    const updatedRow = { ...entryRow, servings: 2, notes: 'Half batch' };
    const updateChain = singleChain(updatedRow);
    const recipeChain = singleChain(recipeSummary);

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(recipeChain);

    const result = await updateMealEntry('entry-001', {
      servings: 2,
      notes: 'Half batch',
    });

    expect(mockFrom).toHaveBeenCalledWith('meal_plan_entries');
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        servings: 2,
        notes: 'Half batch',
      }),
    );
    expect(result.entry).not.toBeNull();
    expect(result.entry!.servings).toBe(2);
    expect(result.entry!.notes).toBe('Half batch');
    expect(result.error).toBeNull();
  });

  it('updates the recipe and re-fetches the recipe summary', async () => {
    const updatedRow = { ...entryRow, recipe_id: 'recipe-002' };
    const newRecipeSummary = { ...recipeSummary, id: 'recipe-002', title: 'Omelette' };
    const updateChain = singleChain(updatedRow);
    const recipeChain = singleChain(newRecipeSummary);

    mockFrom
      .mockReturnValueOnce(updateChain)
      .mockReturnValueOnce(recipeChain);

    const result = await updateMealEntry('entry-001', {
      recipeId: 'recipe-002',
    });

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ recipe_id: 'recipe-002' }),
    );
    expect(result.entry!.recipe).toEqual(newRecipeSummary);
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await updateMealEntry('entry-001', { servings: 2 });

    expect(result.entry).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when Supabase update fails', async () => {
    const chain = singleChain(null, { message: 'Update failed' });
    mockFrom.mockReturnValue(chain);

    const result = await updateMealEntry('entry-001', { servings: 2 });

    expect(result.entry).toBeNull();
    expect(result.error).toBe('Update failed');
  });
});

// ── generatePlanProposal ─────────────────────────────────────────────────

describe('generatePlanProposal', () => {
  const candidateRecipes = Array.from({ length: 10 }, (_, i) => ({
    id: `recipe-${i}`,
    title: `Recipe ${i}`,
    description: `Description ${i}`,
    prep_time_minutes: 15,
    cook_time_minutes: 30,
    servings: 4,
    difficulty: 'easy',
    image_urls: [],
    dietary_tags: ['vegetarian'],
    cuisine_type: i < 5 ? 'italian' : 'mexican',
  }));

  it('generates a full week draft plan based on family preferences', async () => {
    // 1. Preferences
    mockGetAggregatedPreferences.mockResolvedValue({
      preferences: aggregatedPrefs,
      error: null,
    });

    // 2. No existing draft plan
    const existingChain = singleChain(null);
    existingChain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    existingChain.select = vi.fn().mockReturnValue(existingChain);
    existingChain.eq = vi.fn().mockReturnValue(existingChain);

    // 3. Create new plan
    const createPlanChain = singleChain(mealPlanRow);

    // 4. Candidate recipes
    const recipeQueryChain: any = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: candidateRecipes, error: null }),
    };

    // 5. Entry inserts (21 entries for 7 days × 3 slots)
    const entryInsertChain = singleChain(entryRow);

    mockFrom
      .mockReturnValueOnce(existingChain)    // check existing draft
      .mockReturnValueOnce(createPlanChain)   // create new plan
      .mockReturnValueOnce(recipeQueryChain)  // fetch candidate recipes
      .mockReturnValue(entryInsertChain);     // entry inserts (repeated)

    const result = await generatePlanProposal(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).not.toBeNull();
    expect(result.mealPlan!.status).toBe('draft');
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await generatePlanProposal(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when preferences cannot be loaded', async () => {
    mockGetAggregatedPreferences.mockResolvedValue({
      preferences: null,
      error: 'Preferences not found',
    });

    const result = await generatePlanProposal(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Preferences not found');
  });

  it('returns error when no candidate recipes are found', async () => {
    mockGetAggregatedPreferences.mockResolvedValue({
      preferences: aggregatedPrefs,
      error: null,
    });

    // Both primary and fallback recipe queries return empty
    const emptyRecipeChain: any = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    const fallbackChain: any = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    mockFrom
      .mockReturnValueOnce(emptyRecipeChain)
      .mockReturnValueOnce(fallbackChain);

    const result = await generatePlanProposal(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('No recipes found matching family preferences');
  });

  it('deletes existing draft plan before creating a new one', async () => {
    mockGetAggregatedPreferences.mockResolvedValue({
      preferences: aggregatedPrefs,
      error: null,
    });

    // Existing draft plan found
    const existingPlan = { id: 'old-plan-001' };
    const existingChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: existingPlan, error: null }),
      delete: vi.fn().mockReturnThis(),
    };
    // The delete chain needs eq to resolve
    existingChain.eq.mockImplementation(() => existingChain);
    existingChain.delete.mockImplementation(() => existingChain);
    // Make the final eq on delete resolve
    const deleteResolve = vi.fn().mockResolvedValue({ error: null });
    existingChain.eq = vi.fn().mockImplementation((col: string, val: string) => {
      if (col === 'id') return { ...existingChain, then: deleteResolve };
      return existingChain;
    });

    // Create new plan
    const createPlanChain = singleChain(mealPlanRow);

    // Candidate recipes
    const recipeQueryChain: any = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: candidateRecipes, error: null }),
    };

    // Entry inserts
    const entryInsertChain = singleChain(entryRow);

    mockFrom
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(createPlanChain)
      .mockReturnValueOnce(recipeQueryChain)
      .mockReturnValue(entryInsertChain);

    const result = await generatePlanProposal(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('returns error when plan creation fails', async () => {
    mockGetAggregatedPreferences.mockResolvedValue({
      preferences: aggregatedPrefs,
      error: null,
    });

    // No existing draft
    const existingChain: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    // Plan creation fails
    const createPlanChain = singleChain(null, { message: 'Unique violation' });

    // Candidate recipes
    const recipeQueryChain: any = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: candidateRecipes, error: null }),
    };

    mockFrom
      .mockReturnValueOnce(existingChain)
      .mockReturnValueOnce(recipeQueryChain)
      .mockReturnValueOnce(createPlanChain);

    const result = await generatePlanProposal(FAMILY_ID, WEEK_START);

    expect(result.mealPlan).toBeNull();
    expect(result.error).toBe('Unique violation');
  });
});
