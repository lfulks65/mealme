/**
 * @module recipe
 * Recipe domain types for MealMe.
 *
 * Recipes are the core content type. They describe a dish with
 * ingredients, instructions, nutritional info, and metadata
 * like cuisine type and dietary tags.
 */

import type { DietaryRestriction } from '../constants/dietary-restrictions';
import type { CuisineType } from '../constants/cuisine-types';

/** Difficulty level for a recipe. */
export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

/** Unit of measurement for recipe ingredients. */
export type MeasurementUnit =
  | 'tsp'
  | 'tbsp'
  | 'cup'
  | 'oz'
  | 'lb'
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'pinch'
  | 'clove'
  | 'slice'
  | 'piece'
  | 'can'
  | 'bunch'
  | 'whole';

/**
 * A single ingredient in a recipe.
 */
export interface RecipeIngredient {
  /** Unique ID within the recipe. */
  id: string;
  /** Ingredient name (e.g., "Chicken breast"). */
  name: string;
  /** Quantity required. */
  quantity: number;
  /** Unit of measurement. */
  unit: MeasurementUnit;
  /** Optional preparation note (e.g., "diced", "minced"). */
  preparation?: string;
  /** Whether this ingredient is optional. */
  optional?: boolean;
}

/**
 * A single step in the recipe instructions.
 */
export interface RecipeStep {
  /** Step number (1-based). */
  step: number;
  /** Instruction text. */
  instruction: string;
  /** Duration in minutes for this step, if applicable. */
  durationMinutes?: number;
  /** URL to a photo or video illustrating this step. */
  mediaUrl?: string;
}

/**
 * Nutritional information per serving.
 */
export interface NutritionInfo {
  /** Calories per serving. */
  calories: number;
  /** Grams of protein per serving. */
  protein: number;
  /** Grams of carbohydrates per serving. */
  carbs: number;
  /** Grams of fat per serving. */
  fat: number;
  /** Grams of fiber per serving. */
  fiber?: number;
  /** Grams of sugar per serving. */
  sugar?: number;
  /** Milligrams of sodium per serving. */
  sodium?: number;
}

/**
 * Represents a recipe in the MealMe system.
 *
 * Recipes can be user-created or sourced from the MealMe library.
 * They are associated with a Family and tagged with dietary and
 * cuisine metadata.
 */
export interface Recipe {
  /** Unique identifier (UUID v4). */
  id: string;
  /** Recipe title. */
  title: string;
  /** Description or subtitle. */
  description?: string;
  /** ID of the Family that owns this recipe (null for library recipes). */
  familyId?: string;
  /** ID of the User who created this recipe. */
  createdBy?: string;
  /** List of ingredients. */
  ingredients: RecipeIngredient[];
  /** Ordered list of preparation steps. */
  steps: RecipeStep[];
  /** Number of servings the recipe yields. */
  servings: number;
  /** Total preparation time in minutes. */
  prepTimeMinutes: number;
  /** Total cooking time in minutes. */
  cookTimeMinutes: number;
  /** Difficulty rating. */
  difficulty: RecipeDifficulty;
  /** Nutritional info per serving. */
  nutrition?: NutritionInfo;
  /** Dietary restriction tags. */
  dietaryTags: DietaryRestriction[];
  /** Cuisine type tag. */
  cuisineType?: CuisineType;
  /** URLs to photos of the finished dish. */
  imageUrls: string[];
  /** Whether this recipe is from the MealMe library (read-only). */
  isLibrary: boolean;
  /** ISO-8601 timestamp when the recipe was created. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent update. */
  updatedAt: string;
}

/**
 * Payload for creating a new recipe.
 */
export interface CreateRecipeInput {
  title: string;
  description?: string;
  familyId?: string;
  ingredients: Omit<RecipeIngredient, 'id'>[];
  steps: Omit<RecipeStep, 'step'>[];
  servings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  difficulty: RecipeDifficulty;
  nutrition?: NutritionInfo;
  dietaryTags: DietaryRestriction[];
  cuisineType?: CuisineType;
  imageUrls?: string[];
}

/**
 * Payload for updating an existing recipe.
 * All fields are optional; only provided fields are updated.
 */
export interface UpdateRecipeInput {
  title?: string;
  description?: string;
  ingredients?: Omit<RecipeIngredient, 'id'>[];
  steps?: Omit<RecipeStep, 'step'>[];
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  difficulty?: RecipeDifficulty;
  nutrition?: NutritionInfo;
  dietaryTags?: DietaryRestriction[];
  cuisineType?: CuisineType;
  imageUrls?: string[];
}
