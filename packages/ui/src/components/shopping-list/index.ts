/**
 * Shopping List — shopping list UI components for MealMe
 *
 * Provides ShoppingListScreen for categorized list view,
 * ShoppingListDetailScreen for full list with progress,
 * and useShoppingList hook for data management.
 */

export { ShoppingListScreen } from './ShoppingListScreen';
export type { ShoppingListScreenProps } from './ShoppingListScreen';

export { ShoppingListDetailScreen } from './ShoppingListDetailScreen';
export type { ShoppingListDetailScreenProps } from './ShoppingListDetailScreen';

export { useShoppingList, CATEGORY_META, CATEGORY_ORDER } from './useShoppingList';
export type {
  ShoppingListState,
  CategorizedItems,
  UseShoppingListResult,
} from './useShoppingList';
