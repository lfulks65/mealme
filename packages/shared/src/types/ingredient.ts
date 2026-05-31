/**
 * @module ingredient
 * Standalone Ingredient type for pantry/grocery-level ingredients.
 *
 * Unlike `RecipeIngredient` (which is recipe-scoped with quantity/unit),
 * this type represents a canonical ingredient in the pantry or grocery
 * domain — the thing you buy, store, and track.
 */

import type { MeasurementUnitKey } from '../constants/measurement-units';

/** All supported ingredient categories. */
export type IngredientCategory =
  | 'produce'
  | 'dairy'
  | 'meat'
  | 'pantry'
  | 'frozen'
  | 'bakery'
  | 'beverage'
  | 'spice';

/** Readonly array of all ingredient categories for iteration. */
export const INGREDIENT_CATEGORIES: readonly IngredientCategory[] = [
  'produce',
  'dairy',
  'meat',
  'pantry',
  'frozen',
  'bakery',
  'beverage',
  'spice',
] as const;

/**
 * Represents a standalone ingredient in the MealMe system.
 *
 * This is a pantry/grocery-level ingredient — the canonical record
 * for a food item, independent of any specific recipe.
 */
export interface Ingredient {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Display name (e.g., "Chicken Breast", "Extra Virgin Olive Oil"). */
  name: string;
  /** Category for grouping and filtering. */
  category: IngredientCategory;
  /** Default unit used when adding this ingredient to a recipe or list. */
  defaultUnit: MeasurementUnitKey;
  /** Optional short description. */
  description?: string;
  /** Optional URL to an image of the ingredient. */
  imageUrl?: string;
  /** Allergen tags (e.g., "gluten", "dairy", "nuts"). */
  allergens?: string[];
  /** ISO-8601 timestamp when the ingredient was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}
