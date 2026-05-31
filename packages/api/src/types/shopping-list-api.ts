/**
 * @module types/shopping-list-api
 *
 * Shopping list API request/response types.
 *
 * Extends the base domain types from `@mealme/shared` with
 * API-specific request/response wrappers for shopping list CRUD
 * and item toggle endpoints.
 */

import type {
  ShoppingList,
  CreateShoppingListInput,
  UpdateShoppingListInput,
  ShoppingListItem,
  ItemStatus,
} from '@mealme/shared';

import type { PaginatedResponse, PaginationParams } from './api';

// ---------------------------------------------------------------------------
// List shopping lists
// ---------------------------------------------------------------------------

/** Request parameters for listing shopping lists. */
export interface ListShoppingListsRequest extends PaginationParams {
  /** Filter by family. */
  familyId: string;
}

/** Paginated response of shopping lists. */
export type ListShoppingListsResponse = PaginatedResponse<ShoppingList>;

// ---------------------------------------------------------------------------
// Get shopping list
// ---------------------------------------------------------------------------

/** Response for a single shopping list. */
export type GetShoppingListResponse = ShoppingList;

// ---------------------------------------------------------------------------
// Create shopping list
// ---------------------------------------------------------------------------

/** Request body for creating a shopping list. */
export type CreateShoppingListRequest = CreateShoppingListInput;

/** Response for a created shopping list. */
export type CreateShoppingListResponse = ShoppingList;

// ---------------------------------------------------------------------------
// Update shopping list
// ---------------------------------------------------------------------------

/** Request body for updating a shopping list. */
export type UpdateShoppingListRequest = UpdateShoppingListInput;

/** Response for an updated shopping list. */
export type UpdateShoppingListResponse = ShoppingList;

// ---------------------------------------------------------------------------
// Delete shopping list
// ---------------------------------------------------------------------------

/** Response for a deleted shopping list. */
export type DeleteShoppingListResponse = { success: boolean };

// ---------------------------------------------------------------------------
// Toggle item
// ---------------------------------------------------------------------------

/** Request body for toggling a shopping list item's status. */
export interface ToggleItemRequest {
  /** The item to toggle. */
  itemId: string;
  /** The new status. */
  status: ItemStatus;
}

/** Response for a toggled shopping list item. */
export type ToggleItemResponse = ShoppingListItem;
