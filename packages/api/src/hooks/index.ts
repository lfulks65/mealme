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
export { createQueryClient, QueryClientProvider, useQueryClient } from './query-client';

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
  useMemberPreferences,
  useUpdateFamilyPreferences,
  useUpdateMemberPreferences,
  // Backward-compatible aliases
  useUserPreferences,
  useUpdateUserPreferences,
} from './use-preferences';

// Auth hooks — now exported directly from the auth module via authQueries
// (useSignUp, useSignIn, useSignOut, useSignInWithProvider, useResetPassword,
//  useSession, useCurrentUser, authKeys are available from '@mealme/api/auth')
// Re-export useAuth and AuthContextType for backward compatibility
export { useAuth } from '../auth/context';
export type { AuthContextType } from '../auth/context';
