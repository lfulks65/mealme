export {
  useRecipeSearch,
  useRecipeDetail,
  useRecipeCategories,
  useRecipeRecommendations,
  useQuickMeals,
  useCategoryRecipes,
} from './useRecipeApi';

// Tenant hooks — re-exported from @mealme/api for convenient access
export { useTenant, useTenantHeaders } from '@mealme/api';
