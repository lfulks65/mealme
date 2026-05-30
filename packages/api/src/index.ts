/**
 * @mealme/api
 *
 * API client and shared types for the MealMe platform.
 * Re-exports shared types and provides API client utilities.
 */

// Auth module
export * from './auth';

// Org module
export * from './org';

// Family module
export * from './family';

// Re-export shared types for convenience
export type {
  User,
  CreateUserInput,
  UpdateUserInput,
  Recipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  MealPlan,
  CreateMealPlanInput,
  UpdateMealPlanInput,
  ShoppingList,
  CreateShoppingListInput,
  UpdateShoppingListInput,
  Family,
  Org,
} from '@mealme/shared';
