/**
 * Shared types for seed recipe data files.
 */

export interface SeedIngredient {
  name: string;
  quantity: string;
  unit: string;
  optional?: boolean;
}

export interface SeedStep {
  step_number: number;
  instruction: string;
  timer_minutes?: number;
}

export interface NutritionData {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  sodium_mg: number;
}

export interface SeedRecipe {
  title: string;
  description: string;
  cuisine: string;
  image_url?: string;
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  calories?: number;
  ingredients: SeedIngredient[];
  steps: SeedStep[];
  tags: string[];
  dietary_info: { restriction: string; is_compliant: boolean }[];
  nutrition?: NutritionData;
}

/**
 * Simplified config for defining recipes — steps are plain strings
 * that get auto-numbered by `generateCuisineRecipes`.
 */
export interface CuisineRecipeConfig {
  title: string;
  description: string;
  cuisine: string;
  prep_minutes: number;
  cook_minutes: number;
  servings: number;
  calories: number;
  ingredients: { name: string; quantity: string; unit: string; optional?: boolean }[];
  steps: string[];
  tags: string[];
  dietary_info: { restriction: string; is_compliant: boolean }[];
  nutrition: NutritionData;
}

/**
 * Convert an array of CuisineRecipeConfig objects into full SeedRecipe objects.
 * Auto-numbers step strings into SeedStep objects.
 */
export function generateCuisineRecipes(configs: CuisineRecipeConfig[]): SeedRecipe[] {
  return configs.map((cfg) => ({
    title: cfg.title,
    description: cfg.description,
    cuisine: cfg.cuisine,
    prep_minutes: cfg.prep_minutes,
    cook_minutes: cfg.cook_minutes,
    servings: cfg.servings,
    calories: cfg.calories,
    ingredients: cfg.ingredients.map((ing) => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      optional: ing.optional ?? false,
    })),
    steps: cfg.steps.map((instruction, idx) => ({
      step_number: idx + 1,
      instruction,
    })),
    tags: cfg.tags,
    dietary_info: cfg.dietary_info,
    nutrition: cfg.nutrition,
  }));
}
