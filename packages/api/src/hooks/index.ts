/**
 * @module hooks
 * Barrel export for all React Query hooks and the query client provider.
 *
 * Re-exports:
 *   - QueryClient provider, factory, and hook
 *   - Recipe hooks
 *   - Meal plan hooks
 *   - Shopping list hooks
 *   - Family hooks
 *   - Preferences hooks
 *   - Auth hooks
 */

// Query client setup
export {
  createQueryClient,
  QueryClientProvider,
  useQueryClient,
} from './query-client';

// Recipe hooks
export {
  recipeKeys,
  useRecipes,
  useRecipe,
  useRecipeSearch,
  useRecipeRecommendations,
} from './use-recipes';

// Meal plan hooks
export {
  mealPlanKeys,
  useMealPlans,
  useMealPlan,
  useCreateMealPlan,
  useUpdateMealPlan,
  useDeleteMealPlan,
} from './use-meal-plans';

// Shopping list hooks
export {
  shoppingListKeys,
  useShoppingLists,
  useShoppingList,
  useCreateShoppingList,
  useUpdateShoppingList,
  useDeleteShoppingList,
  useToggleShoppingListItem,
} from './use-shopping-lists';

// Family hooks
export {
  familyKeys,
  useFamilies,
  useFamilyQuery,
  useCreateFamily,
  useUpdateFamily,
  useInviteFamilyMember,
  useRemoveFamilyMember,
} from './use-family';

// Preferences hooks
export {
  preferenceKeys,
  useFamilyPreferences,
  useUserPreferences,
  useUpdateFamilyPreferences,
  useUpdateUserPreferences,
} from './use-preferences';

// Auth hooks
export {
  authKeys,
  useAuth,
  useSignUp,
  useSignIn,
  useSignOut,
} from './use-auth';
export type { AuthContextType } from './use-auth';
