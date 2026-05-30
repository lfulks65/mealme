/**
 * @module shopping-list
 * Shopping list domain types for MealMe.
 *
 * A ShoppingList is auto-generated from a MealPlan or manually
 * created. It aggregates ingredients across recipes, consolidates
 * quantities, and tracks purchase status.
 */

import type { MeasurementUnit } from './recipe';

/** Purchase status of a shopping list item. */
export type ItemStatus = 'needed' | 'purchased' | 'unavailable';

/**
 * A single item on a shopping list.
 */
export interface ShoppingListItem {
  /** Unique identifier for this item. */
  id: string;
  /** Ingredient name. */
  name: string;
  /** Total quantity needed. */
  quantity: number;
  /** Unit of measurement. */
  unit: MeasurementUnit;
  /** Purchase status. */
  status: ItemStatus;
  /** IDs of recipes that require this ingredient. */
  recipeIds: string[];
  /** Optional category for grouping (e.g., "Produce", "Dairy"). */
  category?: string;
  /** Whether this item was manually added (not from a recipe). */
  isManual: boolean;
  /** Optional note (e.g., "Get organic"). */
  note?: string;
}

/**
 * Represents a shopping list in the MealMe system.
 *
 * Shopping lists are scoped to a Family and optionally linked
 * to a MealPlan. They can also be standalone (manual) lists.
 */
export interface ShoppingList {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Reference to the Family that owns this list. */
  familyId: string;
  /** Optional reference to the MealPlan this list was generated from. */
  mealPlanId?: string;
  /** Display name for the list. */
  name: string;
  /** Items on the list. */
  items: ShoppingListItem[];
  /** ISO-8601 timestamp when the list was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Payload for creating a new shopping list.
 */
export interface CreateShoppingListInput {
  familyId: string;
  mealPlanId?: string;
  name: string;
  items?: Omit<ShoppingListItem, 'id'>[];
}

/**
 * Payload for updating an existing shopping list.
 */
export interface UpdateShoppingListInput {
  name?: string;
  items?: Omit<ShoppingListItem, 'id'>[];
}
