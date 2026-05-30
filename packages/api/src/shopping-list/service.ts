/**
 * @module shopping-list/service
 * Shopping list CRUD and generation functions for the MealMe API client.
 *
 * All functions interact with Supabase directly and rely on RLS
 * policies for authorization. The current user's session is used
 * implicitly via the Supabase client.
 */

import { supabase } from '../supabase';
import type {
  ShoppingListRow,
  ShoppingListItemRow,
  ShoppingListShareRow,
  AddItemInput,
  UpdateItemInput,
  ShoppingListResult,
  ShoppingListWithItemsResult,
  ShoppingListItemResult,
  ShoppingListListResult,
  ShareListResult,
  AggregatedIngredient,
} from './types';
import { parseIngredients, aggregateIngredients } from './aggregate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the currently authenticated user's ID, or null if not signed in. */
async function getCurrentUserId(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Map a Supabase error to a user-friendly string. */
function mapError(error: { message?: string }, fallback: string): string {
  return error.message ?? fallback;
}

// ---------------------------------------------------------------------------
// createShoppingList
// ---------------------------------------------------------------------------

/**
 * Create a new, empty shopping list for a family.
 *
 * @param familyId - The family this list belongs to
 * @param name - Optional display name (defaults to "Shopping List")
 * @returns The created shopping list row or an error
 */
export async function createShoppingList(
  familyId: string,
  name?: string,
): Promise<ShoppingListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { list: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('shopping_lists')
    .insert({
      family_id: familyId,
      name: name ?? 'Shopping List',
      created_by: userId,
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    return { list: null, error: mapError(error, 'Failed to create shopping list') };
  }

  return { list: data as ShoppingListRow, error: null };
}

// ---------------------------------------------------------------------------
// generateFromMealPlan
// ---------------------------------------------------------------------------

/**
 * Generate a shopping list from a meal plan by aggregating all
 * ingredients across the meal plan's recipes.
 *
 * Steps:
 *  1. Fetch the meal plan and its entries
 *  2. Fetch all unique recipes referenced in the plan
 *  3. Parse and aggregate ingredients (combining duplicates, normalizing units)
 *  4. Create the shopping list and its items
 *
 * @param mealPlanId - The meal plan to generate from
 * @returns The created shopping list with items, or an error
 */
export async function generateFromMealPlan(
  mealPlanId: string,
): Promise<ShoppingListWithItemsResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { list: null, items: [], error: 'Not authenticated' };
  }

  // 1. Fetch the meal plan
  const { data: mealPlan, error: mpError } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('id', mealPlanId)
    .single();

  if (mpError || !mealPlan) {
    return { list: null, items: [], error: mapError(mpError ?? {}, 'Meal plan not found') };
  }

  // 2. Fetch meal plan entries (recipe assignments)
  const { data: entries, error: entriesError } = await supabase
    .from('meal_plan_entries')
    .select('recipe_id')
    .eq('meal_plan_id', mealPlanId);

  if (entriesError) {
    return { list: null, items: [], error: mapError(entriesError, 'Failed to fetch meal plan entries') };
  }

  if (!entries || entries.length === 0) {
    // Create an empty list for a plan with no entries
    const listName = `Meal Plan - ${mealPlan.week_start_date ?? 'Untitled'}`;
    const { data: listData, error: listError } = await supabase
      .from('shopping_lists')
      .insert({
        family_id: mealPlan.family_id,
        meal_plan_id: mealPlanId,
        name: listName,
        created_by: userId,
        status: 'active',
      })
      .select('*')
      .single();

    if (listError) {
      return { list: null, items: [], error: mapError(listError, 'Failed to create shopping list') };
    }

    return { list: listData as ShoppingListRow, items: [], error: null };
  }

  // 3. Fetch unique recipes with their ingredients
  const recipeIds = [...new Set(entries.map((e: { recipe_id: string }) => e.recipe_id))];

  const { data: recipes, error: recipesError } = await supabase
    .from('recipes')
    .select('id, title, ingredients')
    .in('id', recipeIds);

  if (recipesError) {
    return { list: null, items: [], error: mapError(recipesError, 'Failed to fetch recipes') };
  }

  // 4. Parse and aggregate ingredients from all recipes
  const allParsed = (recipes ?? []).flatMap((recipe: { id: string; title: string; ingredients: Array<{ name: string; quantity: number; unit: string }> }) =>
    parseIngredients(recipe.id, recipe.ingredients, recipe.title),
  );

  const aggregated = aggregateIngredients(allParsed);

  // 5. Create the shopping list
  const listName = `Meal Plan - ${mealPlan.week_start_date ?? 'Untitled'}`;

  const { data: listData, error: listError } = await supabase
    .from('shopping_lists')
    .insert({
      family_id: mealPlan.family_id,
      meal_plan_id: mealPlanId,
      name: listName,
      created_by: userId,
      status: 'active',
    })
    .select('*')
    .single();

  if (listError || !listData) {
    return { list: null, items: [], error: mapError(listError ?? {}, 'Failed to create shopping list') };
  }

  // 6. Insert aggregated items
  const itemsToInsert = aggregated.map((agg: AggregatedIngredient) => ({
    shopping_list_id: listData.id,
    ingredient_name: agg.ingredientName,
    quantity: agg.quantity,
    unit: agg.unit,
    category: agg.category,
    checked: false,
    recipe_id: agg.recipeIds.length === 1 ? agg.recipeIds[0] : null,
    recipe_source: agg.recipeSources.length > 0 ? agg.recipeSources.join(', ') : null,
  }));

  let createdItems: ShoppingListItemRow[] = [];

  if (itemsToInsert.length > 0) {
    const { data: itemsData, error: itemsError } = await supabase
      .from('shopping_list_items')
      .insert(itemsToInsert)
      .select('*');

    if (itemsError) {
      // List was created but items failed — return the list anyway with a warning
      return { list: listData as ShoppingListRow, items: [], error: mapError(itemsError, 'List created but items failed') };
    }

    createdItems = (itemsData ?? []) as ShoppingListItemRow[];
  }

  return { list: listData as ShoppingListRow, items: createdItems, error: null };
}

// ---------------------------------------------------------------------------
// getList
// ---------------------------------------------------------------------------

/**
 * Fetch a shopping list with all its items.
 *
 * RLS ensures only family members and shared users can read.
 *
 * @param id - The shopping list ID
 * @returns The shopping list with items, or an error
 */
export async function getList(
  id: string,
): Promise<ShoppingListWithItemsResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { list: null, items: [], error: 'Not authenticated' };
  }

  // Fetch the list
  const { data: listData, error: listError } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('id', id)
    .single();

  if (listError || !listData) {
    return { list: null, items: [], error: mapError(listError ?? {}, 'Shopping list not found') };
  }

  // Fetch items for this list
  const { data: itemsData, error: itemsError } = await supabase
    .from('shopping_list_items')
    .select('*')
    .eq('shopping_list_id', id)
    .order('category', { ascending: true })
    .order('ingredient_name', { ascending: true });

  if (itemsError) {
    return { list: listData as ShoppingListRow, items: [], error: mapError(itemsError, 'Failed to fetch items') };
  }

  return {
    list: listData as ShoppingListRow,
    items: (itemsData ?? []) as ShoppingListItemRow[],
    error: null,
  };
}

// ---------------------------------------------------------------------------
// listLists
// ---------------------------------------------------------------------------

/**
 * List all shopping lists for a family.
 *
 * Returns lists ordered by most recently created first.
 *
 * @param familyId - The family whose lists to fetch
 * @returns Array of shopping list rows, or an error
 */
export async function listLists(
  familyId: string,
): Promise<ShoppingListListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { lists: [], error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('shopping_lists')
    .select('*')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false });

  if (error) {
    return { lists: [], error: mapError(error, 'Failed to fetch shopping lists') };
  }

  return { lists: (data ?? []) as ShoppingListRow[], error: null };
}

// ---------------------------------------------------------------------------
// addItem
// ---------------------------------------------------------------------------

/**
 * Add an item to a shopping list.
 *
 * @param listId - The shopping list to add the item to
 * @param input - The item details
 * @returns The created item, or an error
 */
export async function addItem(
  listId: string,
  input: AddItemInput,
): Promise<ShoppingListItemResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { item: null, error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('shopping_list_items')
    .insert({
      shopping_list_id: listId,
      ingredient_name: input.ingredientName,
      quantity: input.quantity,
      unit: input.unit,
      category: input.category ?? 'other',
      checked: false,
      recipe_id: input.recipeId ?? null,
      recipe_source: input.recipeSource ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return { item: null, error: mapError(error, 'Failed to add item') };
  }

  return { item: data as ShoppingListItemRow, error: null };
}

// ---------------------------------------------------------------------------
// removeItem
// ---------------------------------------------------------------------------

/**
 * Remove an item from a shopping list.
 *
 * @param itemId - The item ID to remove
 * @returns The removed item ID on success, or an error
 */
export async function removeItem(
  itemId: string,
): Promise<{ id: string | null; error: string | null }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { id: null, error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId);

  if (error) {
    return { id: null, error: mapError(error, 'Failed to remove item') };
  }

  return { id: itemId, error: null };
}

// ---------------------------------------------------------------------------
// updateItem
// ---------------------------------------------------------------------------

/**
 * Update a shopping list item (check off, change quantity, etc.).
 *
 * Only provided fields are updated; omitted fields remain unchanged.
 *
 * @param itemId - The item ID to update
 * @param input - The fields to update
 * @returns The updated item, or an error
 */
export async function updateItem(
  itemId: string,
  input: UpdateItemInput,
): Promise<ShoppingListItemResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { item: null, error: 'Not authenticated' };
  }

  // Build the update payload — only include defined fields
  const payload: Record<string, unknown> = {};

  if (input.ingredientName !== undefined) {
    payload.ingredient_name = input.ingredientName;
  }
  if (input.quantity !== undefined) {
    payload.quantity = input.quantity;
  }
  if (input.unit !== undefined) {
    payload.unit = input.unit;
  }
  if (input.category !== undefined) {
    payload.category = input.category;
  }
  if (input.checked !== undefined) {
    payload.checked = input.checked;
  }
  if (input.recipeId !== undefined) {
    payload.recipe_id = input.recipeId;
  }
  if (input.recipeSource !== undefined) {
    payload.recipe_source = input.recipeSource;
  }

  const { data, error } = await supabase
    .from('shopping_list_items')
    .update(payload)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    return { item: null, error: mapError(error, 'Failed to update item') };
  }

  return { item: data as ShoppingListItemRow, error: null };
}

// ---------------------------------------------------------------------------
// shareList
// ---------------------------------------------------------------------------

/**
 * Share a shopping list with another family member.
 *
 * Creates a share record that grants the target user read access
 * to the list and its items.
 *
 * @param listId - The shopping list to share
 * @param targetUserId - The user to share with
 * @returns The created share record, or an error
 */
export async function shareList(
  listId: string,
  targetUserId: string,
): Promise<ShareListResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { share: null, error: 'Not authenticated' };
  }

  // Don't share with yourself
  if (targetUserId === userId) {
    return { share: null, error: 'Cannot share a list with yourself' };
  }

  const { data, error } = await supabase
    .from('shopping_list_shares')
    .insert({
      shopping_list_id: listId,
      user_id: targetUserId,
    })
    .select('*')
    .single();

  if (error) {
    // Handle unique constraint violation (already shared)
    if (error.code === '23505') {
      return { share: null, error: 'List is already shared with this user' };
    }
    return { share: null, error: mapError(error, 'Failed to share list') };
  }

  return { share: data as ShoppingListShareRow, error: null };
}
