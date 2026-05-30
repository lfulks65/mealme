/**
 * @mealme/api
 *
 * API client and shared types for the MealMe platform.
 * Re-exports shared types and provides API client utilities.
 */

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

// API client configuration
export interface ApiClientConfig {
  baseUrl: string;
  apiKey?: string;
  timeout?: number;
}

// Supabase client (anon key + service-role admin)
export { supabase, getSupabaseAdmin } from './supabase';

// API client shell
export function createApiClient(config: ApiClientConfig) {
  return {
    config,
    // Methods will be added here
    // async getUser(id: string): Promise<User> { ... }
    // async getRecipes(): Promise<Recipe[]> { ... }
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
