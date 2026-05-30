/**
 * @module shopping-list
 * Shopping list CRUD API and ingredient aggregation for the MealMe platform.
 *
 * Provides functions to:
 *   - Create and manage shopping lists
 *   - Generate shopping lists from meal plans (with ingredient aggregation)
 *   - Add, remove, and update items (including check-off)
 *   - Share lists with other family members
 *   - Aggregate and normalize ingredients from recipes
 */

// Types
export type {
  ShoppingListRow,
  ShoppingListItemRow,
  ShoppingListShareRow,
  ShoppingItemCategory,
  CreateShoppingListInput,
  AddItemInput,
  UpdateItemInput,
  ShoppingListResult,
  ShoppingListWithItemsResult,
  ShoppingListItemResult,
  ShoppingListListResult,
  ShareListResult,
  ParsedIngredient,
  AggregatedIngredient,
  UnitConversion,
} from './types';

// CRUD & generation functions
export {
  createShoppingList,
  generateFromMealPlan,
  getList,
  listLists,
  addItem,
  removeItem,
  updateItem,
  shareList,
} from './service';

// Aggregation utilities
export {
  canonicalizeUnit,
  convertUnit,
  bestDisplayUnit,
  normalizeIngredientName,
  autoCategorize,
  parseIngredients,
  aggregateIngredients,
} from './aggregate';
