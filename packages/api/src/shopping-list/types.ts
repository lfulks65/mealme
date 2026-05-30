/**
 * @module shopping-list/types
 * Shopping list domain types for the MealMe API client.
 *
 * These types mirror the Supabase `shopping_lists`, `shopping_list_items`,
 * and `shopping_list_shares` tables and provide input/result wrappers
 * for the CRUD and aggregation functions.
 */

// ---------------------------------------------------------------------------
// Database row types (match Supabase schema exactly)
// ---------------------------------------------------------------------------

/** Row from the `shopping_lists` table. */
export interface ShoppingListRow {
  id: string;
  family_id: string;
  meal_plan_id: string | null;
  name: string;
  created_by: string;
  created_at: string;
  status: 'active' | 'completed';
}

/** Row from the `shopping_list_items` table. */
export interface ShoppingListItemRow {
  id: string;
  shopping_list_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  category: ShoppingItemCategory;
  checked: boolean;
  recipe_id: string | null;
  recipe_source: string | null;
  created_at: string;
}

/** Row from the `shopping_list_shares` table. */
export interface ShoppingListShareRow {
  id: string;
  shopping_list_id: string;
  user_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Category type
// ---------------------------------------------------------------------------

/** Category for grouping shopping list items in the store. */
export type ShoppingItemCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'other';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

/** Payload for creating a new shopping list. */
export interface CreateShoppingListInput {
  familyId: string;
  name?: string;
  mealPlanId?: string;
}

/** Payload for adding an item to a shopping list. */
export interface AddItemInput {
  ingredientName: string;
  quantity: number;
  unit: string;
  category?: ShoppingItemCategory;
  recipeId?: string;
  recipeSource?: string;
}

/** Payload for updating a shopping list item. */
export interface UpdateItemInput {
  ingredientName?: string;
  quantity?: number;
  unit?: string;
  category?: ShoppingItemCategory;
  checked?: boolean;
  recipeId?: string | null;
  recipeSource?: string | null;
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

/** Result wrapper for shopping list operations. */
export interface ShoppingListResult {
  list: ShoppingListRow | null;
  error: string | null;
}

/** Result wrapper for shopping list with items. */
export interface ShoppingListWithItemsResult {
  list: ShoppingListRow | null;
  items: ShoppingListItemRow[];
  error: string | null;
}

/** Result wrapper for shopping list item operations. */
export interface ShoppingListItemResult {
  item: ShoppingListItemRow | null;
  error: string | null;
}

/** Result wrapper for list of shopping lists. */
export interface ShoppingListListResult {
  lists: ShoppingListRow[];
  error: string | null;
}

/** Result wrapper for sharing operations. */
export interface ShareListResult {
  share: ShoppingListShareRow | null;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Aggregation types
// ---------------------------------------------------------------------------

/** Parsed ingredient from a recipe, ready for aggregation. */
export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: string;
  recipeId: string;
  recipeSource?: string;
}

/** Aggregated ingredient after combining duplicates. */
export interface AggregatedIngredient {
  ingredientName: string;
  quantity: number;
  unit: string;
  category: ShoppingItemCategory;
  recipeIds: string[];
  recipeSources: string[];
}

/** Unit conversion factor for normalization. */
export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  factor: number;
}
