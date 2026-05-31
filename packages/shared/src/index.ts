/**
 * @mealme/shared
 *
 * Barrel export for the MealMe shared package.
 * Re-exports all domain types, constants, and utilities.
 */

// ── Types ──────────────────────────────────────────────────────────────────
export type { OrgPlan, OrgRole, Org, OrgMembership } from './types/org';

export type { FamilyRole, Family, FamilyMembership } from './types/family';

export type { AuthProvider, User, CreateUserInput, UpdateUserInput } from './types/user';

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

export type { Ingredient, IngredientCategory } from './types/ingredient';

export { INGREDIENT_CATEGORIES } from './types/ingredient';

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
  BudgetRange,
  FamilyPreferences,
  MemberPreferences,
  UpdateFamilyPreferencesInput,
  UpdateMemberPreferencesInput,
} from './types/preferences';

// ── Constants ──────────────────────────────────────────────────────────────
export {
  MEASUREMENT_UNITS,
  MEASUREMENT_UNIT_KEYS,
  getMeasurementUnitLabel,
} from './constants/measurement-units';

export type { MeasurementUnitKey, MeasurementUnitCategory } from './constants/measurement-units';

export {
  DIETARY_RESTRICTIONS,
  DIETARY_RESTRICTION_KEYS,
  DIETARY_RESTRICTIONS_ARRAY,
  getDietaryRestrictionLabel,
} from './constants/dietary-restrictions';

export type { DietaryRestriction } from './constants/dietary-restrictions';

export {
  CUISINE_TYPES,
  CUISINE_TYPE_KEYS,
  CUISINE_PREFERENCES_ARRAY,
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

export { ALLERGIES, ALLERGY_IDS, getAllergyById, getAllergyLabel } from './constants/allergies';

export type { AllergyId, AllergySeverity } from './constants/allergies';

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

export {
  formatQuantity,
  formatDuration,
  formatCalories,
  formatServings,
  formatNutrition,
} from './utils/formatters';

// ── Schemas ─────────────────────────────────────────────────────────────────
export {
  RecipeDifficultySchema,
  RecipeIngredientSchema,
  RecipeStepSchema,
  NutritionInfoSchema,
  RecipeSchema,
  CreateRecipeInputSchema,
  UpdateRecipeInputSchema,
  MealPlanEntrySchema,
  MealPlanSchema,
  CreateMealPlanInputSchema,
  UpdateMealPlanInputSchema,
  FamilyRoleSchema,
  FamilyMembershipSchema,
  FamilySchema,
  AuthProviderSchema,
  UserSchema,
  CreateUserInputSchema,
  UpdateUserInputSchema,
  IngredientCategorySchema,
  IngredientSchema,
  ItemStatusSchema,
  ShoppingListItemSchema,
  ShoppingListSchema,
  CreateShoppingListInputSchema,
  UpdateShoppingListInputSchema,
  FamilyPreferencesSchema,
  MemberPreferencesSchema,
  BudgetRangeSchema,
  UpdateFamilyPreferencesInputSchema,
  UpdateMemberPreferencesInputSchema,
} from './schemas';

export type {
  RecipeIngredientInput,
  RecipeStepInput,
  NutritionInfoInput,
  RecipeInput,
  CreateRecipeInputSchemaType,
  UpdateRecipeInputSchemaType,
  MealPlanEntryInput,
  MealPlanInput,
  CreateMealPlanInputSchemaType,
  UpdateMealPlanInputSchemaType,
  FamilyMembershipInput,
  FamilyInput,
  UserInput,
  CreateUserInputSchemaType,
  UpdateUserInputSchemaType,
  IngredientInput,
  ShoppingListItemInput,
  ShoppingListInput,
  CreateShoppingListInputSchemaType,
  UpdateShoppingListInputSchemaType,
  FamilyPreferencesInput,
  MemberPreferencesInput,
  BudgetRangeInput,
  UpdateFamilyPreferencesInputSchemaType,
  UpdateMemberPreferencesInputSchemaType,
} from './schemas';
