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

// Client module (token management, tenant context, API client)
export * from './client';

// Supabase client (anon key + service-role admin)
export { supabase, getSupabaseAdmin } from './supabase';

// Preferences module
export * from './preferences';

// Meal Plan module
export * from './meal-plan';

// Shopping list module
export * from './shopping-list';

// HEB API bridge
export * from './heb';

// Recipe module
export * from './recipe';

// Error handling
export * from './errors';

// API request/response types
export * from './types';


