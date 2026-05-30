/**
 * @module meal-plan
 * Meal plan CRUD API and AI proposal generation for the MealMe platform.
 *
 * Provides functions to create, read, update, and delete meal plans
 * and their entries, plus an AI-assisted proposal generator that
 * fills a week of meal slots based on family preferences.
 */

// Types
export type {
  MealPlanRow,
  MealPlanStatus,
  MealPlanEntryRow,
  RecipeSummary,
  MealPlanEntryWithRecipe,
  MealPlanWithEntries,
  AddMealEntryInput,
  UpdateMealEntryInput,
  MealPlanResult,
  MealPlanEntryResult,
  MealPlanProposalResult,
} from './types';

// CRUD functions
export {
  createMealPlan,
  getMealPlan,
  getWeeklyPlan,
  addMealEntry,
  removeMealEntry,
  updateMealEntry,
  generatePlanProposal,
} from './functions';
