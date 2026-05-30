/**
 * @module shopping-list/service.test
 * Unit tests for shopping list CRUD and generation functions.
 *
 * The Supabase client is mocked so these tests run without a
 * real database connection.
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
// Import after mocking
// ---------------------------------------------------------------------------

import {
  createShoppingList,
  generateFromMealPlan,
  getList,
  listLists,
  addItem,
  removeItem,
  updateItem,
  shareList,
} from './service';

// ---------------------------------------------------------------------------
// Helpers to build chainable Supabase query mocks
// ---------------------------------------------------------------------------

type MockChain = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  [key: string]: any;
};

/** Build a chainable mock where `.single()` resolves to the given value. */
function singleChain(data: any, error: any = null): MockChain {
  const c: MockChain = {} as MockChain;
  c.select = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.delete = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(c);
  c.order = vi.fn().mockReturnValue(c);
  c.single = vi.fn().mockResolvedValue({ data, error });
  return c;
}

/** Build a chainable mock that resolves as an array (awaited at end of chain). */
function arrayChain(data: any[], error: any = null): MockChain {
  const _resolved = Promise.resolve({ data, error });
  const c: MockChain = {} as MockChain;
  c.select = vi.fn().mockReturnValue(c);
  c.insert = vi.fn().mockReturnValue(c);
  c.update = vi.fn().mockReturnValue(c);
  c.delete = vi.fn().mockReturnValue(c);
  c.eq = vi.fn().mockReturnValue(c);
  c.in = vi.fn().mockReturnValue(c);
  // .order() returns `c` so it can be chained (e.g., .order(...).order(...))
  c.order = vi.fn().mockReturnValue(c);
  // Make the chain thenable so `await` resolves it
  c.then = (resolve: any, reject: any) => _resolved.then(resolve, reject);
  c.catch = (reject: any) => _resolved.catch(reject);
  c.single = vi.fn().mockResolvedValue({ data, error });
  return c;
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const FAMILY_ID = 'fam-001';
const USER_ID = 'usr-001';
const OTHER_USER_ID = 'usr-002';
const LIST_ID = 'list-001';
const MEAL_PLAN_ID = 'mp-001';

const shoppingListRow = {
  id: LIST_ID,
  family_id: FAMILY_ID,
  meal_plan_id: null,
  name: 'Shopping List',
  created_by: USER_ID,
  created_at: '2024-01-01T00:00:00Z',
  status: 'active',
};

const shoppingListItemRow = {
  id: 'item-001',
  shopping_list_id: LIST_ID,
  ingredient_name: 'flour',
  quantity: 2,
  unit: 'cup',
  category: 'pantry',
  checked: false,
  recipe_id: null,
  recipe_source: null,
  created_at: '2024-01-01T00:00:00Z',
};

const mealPlanRow = {
  id: MEAL_PLAN_ID,
  family_id: FAMILY_ID,
  start_date: '2024-01-01',
  created_by: USER_ID,
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

// ── createShoppingList ────────────────────────────────────────────────────

describe('createShoppingList', () => {
  it('creates an empty shopping list with default name', async () => {
    const chain = singleChain(shoppingListRow);
    mockFrom.mockReturnValue(chain);

    const result = await createShoppingList(FAMILY_ID);

    expect(mockFrom).toHaveBeenCalledWith('shopping_lists');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        family_id: FAMILY_ID,
        name: 'Shopping List',
        created_by: USER_ID,
        status: 'active',
      }),
    );
    expect(chain.select).toHaveBeenCalledWith('*');
    expect(result.list).toEqual(shoppingListRow);
    expect(result.error).toBeNull();
  });

  it('creates a shopping list with custom name', async () => {
    const chain = singleChain({ ...shoppingListRow, name: 'Weekly Groceries' });
    mockFrom.mockReturnValue(chain);

    const result = await createShoppingList(FAMILY_ID, 'Weekly Groceries');

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Weekly Groceries',
      }),
    );
    expect(result.list!.name).toBe('Weekly Groceries');
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await createShoppingList(FAMILY_ID);

    expect(result.list).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when Supabase insert fails', async () => {
    const chain = singleChain(null, { message: 'Insert failed' });
    mockFrom.mockReturnValue(chain);

    const result = await createShoppingList(FAMILY_ID);

    expect(result.list).toBeNull();
    expect(result.error).toBe('Insert failed');
  });
});

// ── getList ───────────────────────────────────────────────────────────────

describe('getList', () => {
  it('fetches a shopping list with its items', async () => {
    const listChain = singleChain(shoppingListRow);
    const itemsChain = arrayChain([shoppingListItemRow]);

    mockFrom
      .mockReturnValueOnce(listChain)
      .mockReturnValueOnce(itemsChain);

    const result = await getList(LIST_ID);

    expect(mockFrom).toHaveBeenCalledWith('shopping_lists');
    expect(mockFrom).toHaveBeenCalledWith('shopping_list_items');
    expect(result.list).toEqual(shoppingListRow);
    expect(result.items).toEqual([shoppingListItemRow]);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await getList(LIST_ID);

    expect(result.list).toBeNull();
    expect(result.items).toEqual([]);
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when list not found', async () => {
    const listChain = singleChain(null, { message: 'Not found' });
    mockFrom.mockReturnValueOnce(listChain);

    const result = await getList('nonexistent');

    expect(result.list).toBeNull();
    expect(result.error).toBe('Not found');
  });
});

// ── listLists ─────────────────────────────────────────────────────────────

describe('listLists', () => {
  it('lists all shopping lists for a family', async () => {
    const chain = arrayChain([shoppingListRow]);
    mockFrom.mockReturnValue(chain);

    const result = await listLists(FAMILY_ID);

    expect(mockFrom).toHaveBeenCalledWith('shopping_lists');
    expect(result.lists).toEqual([shoppingListRow]);
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await listLists(FAMILY_ID);

    expect(result.lists).toEqual([]);
    expect(result.error).toBe('Not authenticated');
  });
});

// ── addItem ───────────────────────────────────────────────────────────────

describe('addItem', () => {
  it('adds an item to a shopping list', async () => {
    const chain = singleChain(shoppingListItemRow);
    mockFrom.mockReturnValue(chain);

    const result = await addItem(LIST_ID, {
      ingredientName: 'flour',
      quantity: 2,
      unit: 'cup',
    });

    expect(mockFrom).toHaveBeenCalledWith('shopping_list_items');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        shopping_list_id: LIST_ID,
        ingredient_name: 'flour',
        quantity: 2,
        unit: 'cup',
        category: 'other',
        checked: false,
      }),
    );
    expect(result.item).toEqual(shoppingListItemRow);
    expect(result.error).toBeNull();
  });

  it('adds an item with explicit category', async () => {
    const chain = singleChain({
      ...shoppingListItemRow,
      ingredient_name: 'milk',
      category: 'dairy',
    });
    mockFrom.mockReturnValue(chain);

    const result = await addItem(LIST_ID, {
      ingredientName: 'milk',
      quantity: 1,
      unit: 'gallon',
      category: 'dairy',
    });

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'dairy',
      }),
    );
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await addItem(LIST_ID, {
      ingredientName: 'flour',
      quantity: 2,
      unit: 'cup',
    });

    expect(result.item).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });
});

// ── removeItem ────────────────────────────────────────────────────────────

describe('removeItem', () => {
  it('removes an item from a shopping list', async () => {
    const deleteChain: any = {};
    deleteChain.delete = vi.fn().mockReturnValue(deleteChain);
    deleteChain.eq = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue(deleteChain);

    const result = await removeItem('item-001');

    expect(mockFrom).toHaveBeenCalledWith('shopping_list_items');
    expect(result.id).toBe('item-001');
    expect(result.error).toBeNull();
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await removeItem('item-001');

    expect(result.id).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when delete fails', async () => {
    const deleteChain: any = {};
    deleteChain.delete = vi.fn().mockReturnValue(deleteChain);
    deleteChain.eq = vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } });
    mockFrom.mockReturnValue(deleteChain);

    const result = await removeItem('item-001');

    expect(result.id).toBeNull();
    expect(result.error).toBe('Delete failed');
  });
});

// ── updateItem ────────────────────────────────────────────────────────────

describe('updateItem', () => {
  it('updates item check-off status', async () => {
    const chain = singleChain({
      ...shoppingListItemRow,
      checked: true,
    });
    mockFrom.mockReturnValue(chain);

    const result = await updateItem('item-001', { checked: true });

    expect(mockFrom).toHaveBeenCalledWith('shopping_list_items');
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        checked: true,
      }),
    );
    expect(result.item!.checked).toBe(true);
    expect(result.error).toBeNull();
  });

  it('updates item quantity', async () => {
    const chain = singleChain({
      ...shoppingListItemRow,
      quantity: 3,
    });
    mockFrom.mockReturnValue(chain);

    const result = await updateItem('item-001', { quantity: 3 });

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        quantity: 3,
      }),
    );
    expect(result.error).toBeNull();
  });

  it('only updates provided fields', async () => {
    const chain = singleChain(shoppingListItemRow);
    mockFrom.mockReturnValue(chain);

    await updateItem('item-001', { checked: true });

    // Should only include 'checked' in the payload
    expect(chain.update).toHaveBeenCalledWith({
      checked: true,
    });
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await updateItem('item-001', { checked: true });

    expect(result.item).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when update fails', async () => {
    const chain = singleChain(null, { message: 'Update failed' });
    mockFrom.mockReturnValue(chain);

    const result = await updateItem('item-001', { checked: true });

    expect(result.item).toBeNull();
    expect(result.error).toBe('Update failed');
  });
});

// ── shareList ─────────────────────────────────────────────────────────────

describe('shareList', () => {
  it('shares a list with another user', async () => {
    const shareRow = {
      id: 'share-001',
      shopping_list_id: LIST_ID,
      user_id: OTHER_USER_ID,
      created_at: '2024-01-01T00:00:00Z',
    };
    const chain = singleChain(shareRow);
    mockFrom.mockReturnValue(chain);

    const result = await shareList(LIST_ID, OTHER_USER_ID);

    expect(mockFrom).toHaveBeenCalledWith('shopping_list_shares');
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        shopping_list_id: LIST_ID,
        user_id: OTHER_USER_ID,
      }),
    );
    expect(result.share).toEqual(shareRow);
    expect(result.error).toBeNull();
  });

  it('rejects sharing with yourself', async () => {
    const result = await shareList(LIST_ID, USER_ID);

    expect(result.share).toBeNull();
    expect(result.error).toBe('Cannot share a list with yourself');
  });

  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await shareList(LIST_ID, OTHER_USER_ID);

    expect(result.share).toBeNull();
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when already shared with user (unique constraint)', async () => {
    const chain = singleChain(null, { code: '23505', message: 'Duplicate' });
    mockFrom.mockReturnValue(chain);

    const result = await shareList(LIST_ID, OTHER_USER_ID);

    expect(result.share).toBeNull();
    expect(result.error).toBe('List is already shared with this user');
  });

  it('returns error for other Supabase errors', async () => {
    const chain = singleChain(null, { message: 'Foreign key violation' });
    mockFrom.mockReturnValue(chain);

    const result = await shareList(LIST_ID, OTHER_USER_ID);

    expect(result.share).toBeNull();
    expect(result.error).toBe('Foreign key violation');
  });
});

// ── generateFromMealPlan ──────────────────────────────────────────────────

describe('generateFromMealPlan', () => {
  it('returns error when not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
    });

    const result = await generateFromMealPlan(MEAL_PLAN_ID);

    expect(result.list).toBeNull();
    expect(result.items).toEqual([]);
    expect(result.error).toBe('Not authenticated');
  });

  it('returns error when meal plan not found', async () => {
    const chain = singleChain(null, { message: 'Not found' });
    mockFrom.mockReturnValue(chain);

    const result = await generateFromMealPlan('nonexistent');

    expect(result.list).toBeNull();
    expect(result.error).toBe('Not found');
  });

  it('creates empty list when meal plan has no entries', async () => {
    // First call: meal plan
    const mpChain = singleChain(mealPlanRow);
    // Second call: entries (empty)
    const entriesChain = arrayChain([]);
    // Third call: create list
    const listChain = singleChain({
      ...shoppingListRow,
      meal_plan_id: MEAL_PLAN_ID,
      name: 'Meal Plan - 2024-01-01',
    });

    mockFrom
      .mockReturnValueOnce(mpChain)
      .mockReturnValueOnce(entriesChain)
      .mockReturnValueOnce(listChain);

    const result = await generateFromMealPlan(MEAL_PLAN_ID);

    expect(result.list!.meal_plan_id).toBe(MEAL_PLAN_ID);
    expect(result.items).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('creates list with aggregated items from meal plan recipes', async () => {
    // First call: meal plan (single)
    const mpChain = singleChain(mealPlanRow);
    // Second call: entries (array via .in())
    const entriesChain = arrayChain([
      { recipe_id: 'recipe-1' },
      { recipe_id: 'recipe-2' },
    ]);
    // Third call: recipes (array via .in())
    const recipesChain = arrayChain([
      {
        id: 'recipe-1',
        title: 'Pancakes',
        ingredients: [
          { name: 'Flour', quantity: 2, unit: 'cups' },
          { name: 'Sugar', quantity: 1, unit: 'tbsp' },
        ],
      },
      {
        id: 'recipe-2',
        title: 'Gravy',
        ingredients: [
          { name: 'Flour', quantity: 0.5, unit: 'cup' },
          { name: 'Butter', quantity: 2, unit: 'tbsp' },
        ],
      },
    ]);
    // Fourth call: create list (single)
    const listChain = singleChain({
      ...shoppingListRow,
      meal_plan_id: MEAL_PLAN_ID,
      name: 'Meal Plan - 2024-01-01',
    });
    // Fifth call: insert items (array)
    const itemsChain = arrayChain([
      { id: 'item-1', ingredient_name: 'flour', quantity: 2.5, unit: 'cup', category: 'pantry' },
      { id: 'item-2', ingredient_name: 'butter', quantity: 2, unit: 'tbsp', category: 'dairy' },
      { id: 'item-3', ingredient_name: 'sugar', quantity: 1, unit: 'tbsp', category: 'pantry' },
    ]);

    mockFrom
      .mockReturnValueOnce(mpChain)       // meal plan query
      .mockReturnValueOnce(entriesChain)  // entries query
      .mockReturnValueOnce(recipesChain)  // recipes query
      .mockReturnValueOnce(listChain)     // create list
      .mockReturnValueOnce(itemsChain);   // insert items

    const result = await generateFromMealPlan(MEAL_PLAN_ID);

    expect(result.list).not.toBeNull();
    expect(result.list!.meal_plan_id).toBe(MEAL_PLAN_ID);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.error).toBeNull();

    // Verify flour was aggregated (2 cups + 0.5 cups = 2.5 cups)
    const flourItem = result.items.find(
      (i: any) => i.ingredient_name === 'flour',
    );
    expect(flourItem).toBeDefined();
    expect(flourItem!.quantity).toBe(2.5);
    expect(flourItem!.unit).toBe('cup');
  });
});
