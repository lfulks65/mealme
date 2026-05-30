import { getSupabaseClient } from '../lib/supabase';
import { attachRelations } from './search';
import type {
  RecipeFull,
  RecipeRecommendation,
  FamilyPreferences,
} from '@mealme/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a camelCase dietary restriction name (e.g. "glutenFree")
 * to the kebab-case format used in recipe data (e.g. "gluten-free").
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

// ── Scoring Weights ──────────────────────────────────────────────────────────

const WEIGHTS = {
  /** Bonus for each matched dietary restriction */
  DIETARY_MATCH: 20,
  /** Bonus for matching a preferred cuisine */
  CUISINE_MATCH: 15,
  /** Penalty for each allergen found in ingredients */
  ALLERGEN_PENALTY: -50,
  /** Bonus for each matched tag (from family preferences or popular tags) */
  TAG_MATCH: 5,
  /** Small bonus for lower cook time (family-friendly) */
  QUICK_MEAL_BONUS: 5,
  /** Threshold for "quick meal" in minutes */
  QUICK_MEAL_THRESHOLD: 30,
} as const;

// ── Family Preference Fetcher ────────────────────────────────────────────────

/**
 * Fetch family dietary preferences from the database.
 * Falls back to empty preferences if the family doesn't exist.
 */
export async function getFamilyPreferences(
  familyId: string
): Promise<FamilyPreferences> {
  const sb = getSupabaseClient();

  // Try to fetch from a family_preferences table if it exists
  const { data, error } = await sb
    .from('family_preferences')
    .select('*')
    .eq('family_id', familyId)
    .single();

  if (error || !data) {
    // Return empty preferences — the recommendation engine will still work
    // but won't have preference-based scoring
    return {
      familyId: familyId,
      dietaryRestrictions: [],
      preferredCuisines: [],
      budgetTier: 'moderate',
      maxServingsPerMeal: 4,
      activeMealSlots: [],
      includeLibraryRecipes: true,
      excludedIngredients: [],
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    familyId: familyId,
    dietaryRestrictions: data.dietary_restrictions ?? [],
    preferredCuisines: data.cuisine_preferences ?? [],
    budgetTier: data.budget_tier ?? 'moderate',
    maxServingsPerMeal: data.household_size ?? 4,
    activeMealSlots: [],
    includeLibraryRecipes: true,
    excludedIngredients: data.excluded_ingredients ?? [],
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

// ── Scoring Engine ───────────────────────────────────────────────────────────

interface ScoreBreakdown {
  dietaryScore: number;
  cuisineScore: number;
  allergenScore: number;
  tagScore: number;
  quickMealScore: number;
  total: number;
  reasons: string[];
}

/**
 * Score a single recipe against family preferences.
 * Returns a breakdown with total score and human-readable reasons.
 */
export function scoreRecipe(
  recipe: RecipeFull,
  preferences: FamilyPreferences
): ScoreBreakdown {
  let dietaryScore = 0;
  let cuisineScore = 0;
  let allergenScore = 0;
  let tagScore = 0;
  let quickMealScore = 0;
  const reasons: string[] = [];

  // ── Dietary restriction scoring ──────────────────────────────────────────
  if (preferences.dietaryRestrictions.length > 0) {
    const matchedRestrictions = preferences.dietaryRestrictions.filter(
      (restriction: string) =>
        recipe.dietary_info.some(
          (di) => toKebabCase(restriction) === di.restriction && di.is_compliant
        )
    );

    dietaryScore =
      matchedRestrictions.length * WEIGHTS.DIETARY_MATCH;

    if (matchedRestrictions.length > 0) {
      reasons.push(
        `Matches dietary needs: ${matchedRestrictions.join(', ')}`
      );
    }

    // Heavy penalty if recipe doesn't comply with a required restriction
    const nonCompliant = preferences.dietaryRestrictions.filter(
      (restriction: string) =>
        !recipe.dietary_info.some(
          (di) => toKebabCase(restriction) === di.restriction && di.is_compliant
        )
    );
    if (nonCompliant.length > 0) {
      dietaryScore += nonCompliant.length * WEIGHTS.ALLERGEN_PENALTY;
      reasons.push(
        `Does not meet: ${nonCompliant.join(', ')}`
      );
    }
  }

  // ── Cuisine preference scoring ───────────────────────────────────────────
  if (
    preferences.preferredCuisines.length > 0 &&
    recipe.cuisine
  ) {
    const cuisineMatch = preferences.preferredCuisines.some(
      (pref) => pref.toLowerCase() === recipe.cuisine!.toLowerCase()
    );
    if (cuisineMatch) {
      cuisineScore = WEIGHTS.CUISINE_MATCH;
      reasons.push(`Preferred cuisine: ${recipe.cuisine}`);
    }
  }

  // ── Allergen / excluded ingredient scoring ────────────────────────────────
  if (preferences.excludedIngredients.length > 0) {
    const ingredientNames = recipe.ingredients.map((i) =>
      i.name.toLowerCase()
    );
    const foundAllergens = preferences.excludedIngredients.filter((allergen: string) =>
      ingredientNames.some((name) =>
        name.includes(allergen.toLowerCase())
      )
    );

    if (foundAllergens.length > 0) {
      allergenScore = foundAllergens.length * WEIGHTS.ALLERGEN_PENALTY;
      reasons.push(`Contains excluded ingredients: ${foundAllergens.join(', ')}`);
    } else {
      reasons.push('No allergens detected');
    }
  }

  // ── Tag scoring ──────────────────────────────────────────────────────────
  // Bonus for recipes with tags that match dietary preferences
  if (recipe.tags.length > 0 && preferences.dietaryRestrictions.length > 0) {
    const matchingTags = recipe.tags.filter((t) =>
      preferences.dietaryRestrictions.some(
        (dr: string) => toKebabCase(dr) === t.tag.toLowerCase()
      )
    );
    tagScore = matchingTags.length * WEIGHTS.TAG_MATCH;
    if (matchingTags.length > 0) {
      reasons.push(
        `Relevant tags: ${matchingTags.map((t) => t.tag).join(', ')}`
      );
    }
  }

  // ── Quick meal bonus ─────────────────────────────────────────────────────
  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  if (totalTime > 0 && totalTime <= WEIGHTS.QUICK_MEAL_THRESHOLD) {
    quickMealScore = WEIGHTS.QUICK_MEAL_BONUS;
    reasons.push(`Quick meal: ${totalTime} min total`);
  }

  const total =
    dietaryScore + cuisineScore + allergenScore + tagScore + quickMealScore;

  return {
    dietaryScore,
    cuisineScore,
    allergenScore,
    tagScore,
    quickMealScore,
    total,
    reasons,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Recommend recipes for a family based on their preferences.
 *
 * Scoring algorithm:
 * 1. Fetch a broad pool of recipes (no strict filtering yet)
 * 2. Score each recipe against family preferences
 * 3. Exclude recipes with allergens (negative score threshold)
 * 4. Sort by score descending, return top N
 */
export async function recommendRecipes(
  familyId: string,
  limit = 10
): Promise<RecipeRecommendation[]> {
  // 1. Fetch family preferences
  const preferences = await getFamilyPreferences(familyId);

  // 2. Fetch a broad pool of recipes
  // We fetch more than `limit` to have room for filtering
  const poolSize = Math.max(limit * 5, 50);
  const sb = getSupabaseClient();

  const { data, error } = await sb
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(poolSize);

  if (error) throw error;

  const recipes = (data ?? []) as RecipeFull[];
  const withRelations = await attachRelations(recipes);

  // 3. Score each recipe
  const scored: RecipeRecommendation[] = withRelations.map((recipe) => {
    const breakdown = scoreRecipe(recipe, preferences);
    return {
      recipe,
      score: breakdown.total,
      reasons: breakdown.reasons,
    };
  });

  // 4. Filter out recipes with allergens (strongly negative scores)
  //    A recipe with score < 0 has allergens or non-compliant dietary info
  const eligible = scored.filter((r) => r.score >= 0);

  // 5. Sort by score descending and return top N
  eligible.sort((a, b) => b.score - a.score);

  return eligible.slice(0, limit);
}
