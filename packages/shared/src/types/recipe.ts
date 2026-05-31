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

// MeasurementUnit is now derived from the canonical constants file.
// Re-exported for backward compatibility — consumers still import MeasurementUnit.
import type { MeasurementUnitKey } from '../constants/measurement-units';

/** Unit of measurement for recipe ingredients. */
export type MeasurementUnit = MeasurementUnitKey;

/** Difficulty level for a recipe. */
export type RecipeDifficulty = 'easy' | 'medium' | 'hard';

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

// ── Recipe Search & Discovery Types (Supabase-backed) ──────────────────────

/** A single ingredient row from the recipe_ingredients Supabase table. */
export interface RecipeIngredientDB {
  id: string;
  recipe_id: string;
  name: string;
  /** Quantity stored as TEXT in DB (e.g., "1", "0.5", "2 tbsp"). */
  quantity: string;
  /** Unit stored as TEXT in DB — arbitrary strings like "cup", "cups", "pint", "stalks". */
  unit: string;
  optional: boolean;
}

/** A single step for a Supabase-backed recipe (from the recipe_steps table). */
export interface RecipeStepDB {
  id: string;
  recipe_id: string;
  step_number: number;
  instruction: string;
  timer_minutes: number | null;
}

/** A tag associated with a recipe. */
export interface RecipeTag {
  id: string;
  recipe_id: string;
  tag: string;
}

/** Dietary compliance info for a recipe. */
export interface RecipeDietaryInfo {
  id: string;
  recipe_id: string;
  restriction: string;
  is_compliant: boolean;
}

/**
 * Full recipe with all nested relations from Supabase.
 *
 * This is a standalone type that mirrors the actual Supabase schema
 * (snake_case column names, nullable fields, TEXT quantities).
 * It does NOT extend the application-layer `Recipe` type, which uses
 * camelCase and stricter types for UI form handling.
 */
export interface RecipeFull {
  /** UUID primary key. */
  id: string;
  /** Recipe title. */
  title: string;
  /** Description or subtitle (nullable). */
  description: string | null;
  /** Cuisine type as a plain string (nullable). */
  cuisine: string | null;
  /** URL to the recipe image (nullable, single string). */
  image_url: string | null;
  /** Preparation time in minutes (nullable). */
  prep_minutes: number | null;
  /** Cooking time in minutes (nullable). */
  cook_minutes: number | null;
  /** Number of servings (nullable). */
  servings: number | null;
  /** Calories per serving as a top-level column (nullable). */
  calories: number | null;
  /** Source URL for the recipe (nullable). */
  source_url: string | null;
  /** UUID of the user who created the recipe (nullable). */
  created_by: string | null;
  /** ISO-8601 timestamp when the recipe was created. */
  created_at: string;

  // ── Nested relations (attached by attachRelations) ─────────────────────
  ingredients: RecipeIngredientDB[];
  steps: RecipeStepDB[];
  tags: RecipeTag[];
  dietary_info: RecipeDietaryInfo[];
}

/** Filters for recipe search. */
export interface RecipeSearchFilters {
  cuisine?: string;
  tags?: string[];
  dietary_restrictions?: string[];
  max_prep_minutes?: number;
  max_cook_minutes?: number;
  max_calories?: number;
  min_servings?: number;
}

/** Parameters for recipe search. */
export interface RecipeSearchParams {
  query?: string;
  filters?: RecipeSearchFilters;
  limit?: number;
  offset?: number;
}

/** Result of a recipe search. */
export interface RecipeSearchResult {
  recipes: RecipeFull[];
  total: number;
  limit: number;
  offset: number;
}

/** A scored recipe recommendation. */
export interface RecipeRecommendation {
  recipe: RecipeFull;
  score: number;
  reasons: string[];
}

/** A recipe category (cuisine type with count). */
export interface RecipeCategory {
  cuisine: string;
  count: number;
}
