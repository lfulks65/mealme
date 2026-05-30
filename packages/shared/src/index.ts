/**
 * @mealme/shared
 *
 * Barrel export for the MealMe shared package.
 * Re-exports all domain types, constants, and utilities.
 */

// ── Types ──────────────────────────────────────────────────────────────────
export type {
  OrgPlan,
  OrgRole,
  Org,
  OrgMembership,
} from './types/org';

export type {
  FamilyRole,
  Family,
  FamilyMembership,
} from './types/family';

export type {
  AuthProvider,
  User,
  CreateUserInput,
  UpdateUserInput,
} from './types/user';

export type {
  RecipeDifficulty,
  MeasurementUnit,
  RecipeIngredient,
  RecipeStep,
  NutritionInfo,
  Recipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeIngredientDB,
  RecipeInstruction,
  RecipeTag,
  RecipeDietaryInfo,
  RecipeFull,
  RecipeSearchFilters,
  RecipeSearchParams,
  RecipeSearchResult,
  RecipeRecommendation,
  RecipeCategory,
} from './types/recipe';

export type {
  MealPlanEntry,
  MealPlan,
  CreateMealPlanInput,
  UpdateMealPlanInput,
} from './types/meal-plan';

export type {
  ItemStatus,
  ShoppingListItem,
  ShoppingList,
  CreateShoppingListInput,
  UpdateShoppingListInput,
} from './types/shopping-list';

export type {
  FamilyPreferences,
  UserPreferences,
  UpdateFamilyPreferencesInput,
  UpdateUserPreferencesInput,
} from './types/preferences';

// ── Constants ──────────────────────────────────────────────────────────────
export {
  DIETARY_RESTRICTIONS,
  DIETARY_RESTRICTION_KEYS,
  getDietaryRestrictionLabel,
} from './constants/dietary-restrictions';

export type { DietaryRestriction } from './constants/dietary-restrictions';

export {
  CUISINE_TYPES,
  CUISINE_TYPE_KEYS,
  getCuisineTypeLabel,
} from './constants/cuisine-types';

export type { CuisineType } from './constants/cuisine-types';

export {
  MEAL_SLOTS,
  MEAL_SLOT_KEYS,
  getMealSlotLabel,
  getMealSlotDefaultTime,
} from './constants/meal-slots';

export type { MealSlot } from './constants/meal-slots';

export {
  BUDGET_TIERS,
  BUDGET_TIER_KEYS,
  getBudgetTierLabel,
  getBudgetTierWeeklyRange,
} from './constants/budget-tiers';

export type { BudgetTier } from './constants/budget-tiers';

// ── Utilities ──────────────────────────────────────────────────────────────
export {
  getToday,
  formatDate,
  parseDate,
  addDays,
  daysBetween,
  getIsoWeekday,
  getWeekStart,
  getWeekEnd,
  getDateRange,
  isValidDateString,
} from './utils/date-helpers';

export {
  UUID_V4_PATTERN,
  generateId,
  isValidId,
  assertValidId,
  generateIds,
} from './utils/id-helpers';

export {
  isNonEmptyString,
  isValidEmail,
  isPositiveNumber,
  isNonNegativeNumber,
  isIntInRange,
  isNonEmptyArray,
  isArrayOf,
  hasRequiredString,
  hasRequiredId,
  hasRequiredDate,
} from './utils/validation';
