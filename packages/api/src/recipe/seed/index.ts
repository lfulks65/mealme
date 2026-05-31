import type { SeedRecipe } from './types';

import { mexicanRecipes } from './mexican';
import { italianRecipes } from './italian';
import { latinAmericanRecipes } from './latin-american';
import { africanRecipes, africanAdditionalRecipes } from './african';
import { caribbeanRecipes } from './caribbean';
import { britishRecipes } from './british';
import { greekRecipes } from './greek';
import { scandinavianRecipes, scandinavianAdditionalRecipes } from './scandinavian';
import { asianRecipes, asianAdditionalRecipes } from './asian';
import { indianRecipes, indianAdditionalRecipes } from './indian';
import { frenchRecipes, frenchAdditionalRecipes } from './french';
import { middleEasternRecipes } from './middle-eastern';
import { americanRecipes, americanAdditionalRecipes } from './american';
import { mediterraneanRecipes, mediterraneanAdditionalRecipes } from './mediterranean';
import { germanRecipes } from './german';
import { japaneseRecipes } from './japanese';
import { spanishRecipes, spanishAdditionalRecipes } from './spanish';
import { easternEuropeanRecipes, easternEuropeanAdditionalRecipes } from './eastern-european';
import { thaiRecipes } from './thai';
import { koreanRecipes } from './korean';
import { vietnameseRecipes } from './vietnamese';
import { brazilianRecipes } from './brazilian';
import { persianRecipes } from './persian';
import { filipinoRecipes } from './filipino';

import { getSupabaseClient } from '../../lib/supabase';

// ── Combined recipe list ────────────────────────────────────────────────────

const recipes: SeedRecipe[] = [
  ...mexicanRecipes,
  ...italianRecipes,
  ...latinAmericanRecipes,
  ...africanRecipes,
  ...africanAdditionalRecipes,
  ...caribbeanRecipes,
  ...britishRecipes,
  ...greekRecipes,
  ...scandinavianRecipes,
  ...scandinavianAdditionalRecipes,
  ...asianRecipes,
  ...asianAdditionalRecipes,
  ...indianRecipes,
  ...indianAdditionalRecipes,
  ...frenchRecipes,
  ...frenchAdditionalRecipes,
  ...middleEasternRecipes,
  ...americanRecipes,
  ...americanAdditionalRecipes,
  ...mediterraneanRecipes,
  ...mediterraneanAdditionalRecipes,
  ...germanRecipes,
  ...japaneseRecipes,
  ...spanishRecipes,
  ...spanishAdditionalRecipes,
  ...easternEuropeanRecipes,
  ...easternEuropeanAdditionalRecipes,
  ...thaiRecipes,
  ...koreanRecipes,
  ...vietnameseRecipes,
  ...brazilianRecipes,
  ...persianRecipes,
  ...filipinoRecipes,
];

// ── Seed function ────────────────────────────────────────────────────────────

/**
 * Seed all recipes into the database.
 * Inserts into recipes, recipe_ingredients, recipe_steps,
 * recipe_tags, and recipe_dietary_info in the correct FK order.
 */
export async function seedRecipes(): Promise<void> {
  const sb = getSupabaseClient();

  for (const recipe of recipes) {
    // 1. Insert recipe row
    const { data: recipeRow, error: recipeError } = await sb
      .from('recipes')
      .insert({
        title: recipe.title,
        description: recipe.description,
        cuisine: recipe.cuisine,
        image_url: recipe.image_url ?? null,
        prep_minutes: recipe.prep_minutes,
        cook_minutes: recipe.cook_minutes,
        servings: recipe.servings,
        calories: recipe.calories ?? null,
      })
      .select('id')
      .single();

    if (recipeError) {
      console.error(`Failed to insert recipe "${recipe.title}":`, recipeError.message);
      continue;
    }

    const recipeId: string = recipeRow.id;

    // 2. Insert ingredients
    const ingredientRows = recipe.ingredients.map((ing) => ({
      recipe_id: recipeId,
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      optional: ing.optional ?? false,
    }));

    const { error: ingError } = await sb.from('recipe_ingredients').insert(ingredientRows);
    if (ingError) {
      console.error(`  Ingredients error for "${recipe.title}":`, ingError.message);
    }

    // 3. Insert instructions
    const instructionRows = recipe.steps.map((inst) => ({
      recipe_id: recipeId,
      step_number: inst.step_number,
      instruction: inst.instruction,
      timer_minutes: inst.timer_minutes ?? null,
    }));

    const { error: instError } = await sb.from('recipe_steps').insert(instructionRows);
    if (instError) {
      console.error(`  Instructions error for "${recipe.title}":`, instError.message);
    }

    // 4. Insert tags
    const tagRows = recipe.tags.map((tag) => ({
      recipe_id: recipeId,
      tag,
    }));

    const { error: tagError } = await sb.from('recipe_tags').insert(tagRows);
    if (tagError) {
      console.error(`  Tags error for "${recipe.title}":`, tagError.message);
    }

    // 5. Insert dietary info
    const dietaryRows = recipe.dietary_info.map((di) => ({
      recipe_id: recipeId,
      restriction: di.restriction,
      is_compliant: di.is_compliant,
    }));

    const { error: dietError } = await sb.from('recipe_dietary_info').insert(dietaryRows);
    if (dietError) {
      console.error(`  Dietary info error for "${recipe.title}":`, dietError.message);
    }

    // 6. Insert nutrition data
    if (recipe.nutrition) {
      const { error: nutError } = await sb.from('recipe_nutrition').insert({
        recipe_id: recipeId,
        calories: recipe.nutrition.calories,
        protein_g: recipe.nutrition.protein_g,
        carbs_g: recipe.nutrition.carbs_g,
        fat_g: recipe.nutrition.fat_g,
        fiber_g: recipe.nutrition.fiber_g,
        sugar_g: recipe.nutrition.sugar_g,
        sodium_mg: recipe.nutrition.sodium_mg,
      });
      if (nutError) {
        console.error(`  Nutrition error for "${recipe.title}":`, nutError.message);
      }
    }

    console.log(`✓ Seeded: ${recipe.title}`);
  }

  console.log(`\nDone. Seeded ${recipes.length} recipes.`);
}

// ── Re-export types for convenience ──────────────────────────────────────────

export type {
  SeedRecipe,
  SeedIngredient,
  SeedStep,
  NutritionData,
  CuisineRecipeConfig,
} from './types';
export { generateCuisineRecipes } from './types';
