import { getSupabaseClient } from '../lib/supabase';
import { attachRelations } from './search';
import type {
  RecipeFull,
  RecipeRecommendation,
  FamilyPreferences,
  BudgetRange,
  DietaryRestriction,
  AllergyId,
  CuisineType,
} from '@mealme/shared';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a camelCase dietary restriction name (e.g. "glutenFree")
 * to the kebab-case format used in recipe data (e.g. "gluten-free").
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Deduplicate and merge arrays, preserving order.
 * First occurrence wins for ordering.
 */
function mergeUnique<T>(base: T[], ...overrides: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of [...base, ...overrides]) {
    if (!seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  }
  return result;
}

// ── Scoring Weights ──────────────────────────────────────────────────────────

const WEIGHTS = {
  /** Bonus for each matched dietary restriction */
  DIETARY_MATCH: 20,
  /** Bonus for matching a preferred cuisine */
  CUISINE_MATCH: 15,
  /** Bonus for each matched tag (from family preferences or popular tags) */
  TAG_MATCH: 5,
  /** Small bonus for lower cook time (family-friendly) */
  QUICK_MEAL_BONUS: 5,
  /** Threshold for "quick meal" in minutes */
  QUICK_MEAL_THRESHOLD: 30,
} as const;

// ── Hard Filters ─────────────────────────────────────────────────────────────

/**
 * Check whether a recipe complies with ALL dietary restrictions.
 *
 * A recipe passes only if, for every restriction in the preferences,
 * `recipe.dietary_info` contains an entry where the restriction matches
 * AND `is_compliant === true`.
 *
 * If `dietaryRestrictions` is empty, always returns `true`.
 */
export function passesDietaryFilter(recipe: RecipeFull, dietaryRestrictions: string[]): boolean {
  if (dietaryRestrictions.length === 0) return true;

  return dietaryRestrictions.every((restriction: string) =>
    recipe.dietary_info.some(
      (di) => toKebabCase(restriction) === di.restriction && di.is_compliant,
    ),
  );
}

/**
 * Check whether a recipe is free of all allergens.
 *
 * Returns `false` if any ingredient `name.toLowerCase()` contains any
 * `allergen.toLowerCase()` as a substring.
 *
 * If `allergies` is empty, always returns `true`.
 */
export function passesAllergenFilter(recipe: RecipeFull, allergies: string[]): boolean {
  if (allergies.length === 0) return true;

  const ingredientNames = recipe.ingredients.map((i) => i.name.toLowerCase());

  return allergies.every((allergen: string) =>
    ingredientNames.every((name) => !name.includes(allergen.toLowerCase())),
  );
}

/**
 * Check whether a recipe fits within the family's budget range.
 *
 * Uses a simple heuristic cost estimate:
 *   estimatedCost = ingredients.length × 3 + prep_minutes × 0.5 + cook_minutes × 0.5
 *
 * - If `budgetRange.max === 0` (or no budget set), always passes.
 * - If `budgetRange.min > 0` and estimated cost < min → excluded (too cheap / low quality).
 * - If `budgetRange.max > 0` and estimated cost > max → excluded (over budget).
 */
export function passesBudgetFilter(recipe: RecipeFull, budgetRange: BudgetRange): boolean {
  if (budgetRange.max === 0) return true;

  const estimatedCost =
    recipe.ingredients.length * 3 +
    (recipe.prep_minutes ?? 0) * 0.5 +
    (recipe.cook_minutes ?? 0) * 0.5;

  if (budgetRange.min > 0 && estimatedCost < budgetRange.min) return false;
  if (budgetRange.max > 0 && estimatedCost > budgetRange.max) return false;

  return true;
}

// ── Hard Filter Aggregator ────────────────────────────────────────────────────

/**
 * Result of applying hard filters to a pool of recipes.
 */
export interface RecipeFilterResult {
  /** Recipes that passed all hard filters */
  eligible: RecipeFull[];
  /** Recipes excluded by hard filters, with reasons */
  excluded: { recipe: RecipeFull; reason: string }[];
}

/**
 * Apply all hard filters (dietary, allergen, budget) to a pool of recipes.
 *
 * Returns the eligible set plus exclusion reasons, useful for UI display
 * (e.g. "15 recipes excluded: 8 have allergens, 5 don't meet dietary
 * needs, 2 are over budget").
 */
export function applyHardFilters(
  recipes: RecipeFull[],
  preferences: FamilyPreferences,
): RecipeFilterResult {
  const eligible: RecipeFull[] = [];
  const excluded: { recipe: RecipeFull; reason: string }[] = [];

  for (const recipe of recipes) {
    const reasons: string[] = [];

    if (!passesDietaryFilter(recipe, preferences.dietaryRestrictions)) {
      reasons.push('Does not meet dietary restrictions');
    }

    if (!passesAllergenFilter(recipe, preferences.allergies)) {
      reasons.push('Contains allergens');
    }

    if (!passesBudgetFilter(recipe, preferences.budgetRange)) {
      reasons.push('Over budget');
    }

    if (reasons.length > 0) {
      excluded.push({ recipe, reason: reasons.join('; ') });
    } else {
      eligible.push(recipe);
    }
  }

  return { eligible, excluded };
}

// ── Family Preference Fetcher ────────────────────────────────────────────────

/**
 * Fetch family dietary preferences from the database.
 * Falls back to empty preferences if the family doesn't exist.
 */
export async function getFamilyPreferences(familyId: string): Promise<FamilyPreferences> {
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
      id: '',
      familyId: familyId,
      dietaryRestrictions: [],
      allergies: [],
      cuisinePreferences: [],
      budgetRange: { min: 0, max: 500, currency: 'USD' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: data.id ?? '',
    familyId: familyId,
    dietaryRestrictions: data.dietary_restrictions ?? [],
    allergies: data.allergies ?? [],
    cuisinePreferences: data.cuisine_preferences ?? [],
    budgetRange: data.budget_range ?? { min: 0, max: 500, currency: 'USD' },
    createdAt: data.created_at ?? new Date().toISOString(),
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

// ── Aggregated Preference Fetcher ─────────────────────────────────────────────

/**
 * Fetch and merge family + all member preferences into a single
 * FamilyPreferences object suitable for the recommendation pipeline.
 *
 * Merge rules (mirrors `preferences/functions.ts::getAggregatedPreferences`):
 *   - `dietaryRestrictions`: union of family + all member overrides
 *   - `allergies`: union of family + all member overrides
 *   - `cuisinePreferences`: family list first, then member-only
 *     cuisines appended (deduplicated)
 *   - `budgetRange`: from family only
 *
 * Falls back to just family preferences (or empty defaults) if member
 * data isn't available.
 */
export async function getAggregatedFamilyPreferences(familyId: string): Promise<FamilyPreferences> {
  const sb = getSupabaseClient();

  // 1. Fetch family preferences
  const { data: familyData, error: familyError } = await sb
    .from('family_preferences')
    .select('*')
    .eq('family_id', familyId)
    .single();

  // If no family preferences row, return empty defaults
  if (familyError || !familyData) {
    return {
      id: '',
      familyId: familyId,
      dietaryRestrictions: [],
      allergies: [],
      cuisinePreferences: [],
      budgetRange: { min: 0, max: 500, currency: 'USD' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const familyDietary = (familyData.dietary_restrictions ?? []) as DietaryRestriction[];
  const familyAllergies = (familyData.allergies ?? []) as AllergyId[];
  const familyCuisines = (familyData.cuisine_preferences ?? []) as CuisineType[];

  // 2. Fetch all member preferences via family_members join
  const { data: memberData, error: memberError } = await sb
    .from('family_members')
    .select('id, member_preferences(*)')
    .eq('family_id', familyId);

  // If member fetch fails or returns nothing, fall back to family-only
  if (memberError || !memberData || memberData.length === 0) {
    return {
      id: familyData.id ?? '',
      familyId: familyId,
      dietaryRestrictions: familyDietary,
      allergies: familyAllergies,
      cuisinePreferences: familyCuisines,
      budgetRange: familyData.budget_range ?? { min: 0, max: 500, currency: 'USD' },
      createdAt: familyData.created_at ?? new Date().toISOString(),
      updatedAt: familyData.updated_at ?? new Date().toISOString(),
    };
  }

  // 3. Extract member preferences rows from the join result
  const memberPrefs: {
    dietary_restrictions: DietaryRestriction[];
    allergies: AllergyId[];
    cuisine_preferences: CuisineType[];
  }[] = (memberData ?? []).flatMap((fm: any) => fm.member_preferences ?? []);

  // 4. Merge dietary restrictions: family + all members (union)
  const allDietaryRestrictions = memberPrefs.reduce<DietaryRestriction[]>(
    (acc, m) => mergeUnique(acc, ...(m.dietary_restrictions ?? [])),
    [...familyDietary],
  );

  // 5. Merge allergies: family + all members (union)
  const allAllergies = memberPrefs.reduce<AllergyId[]>(
    (acc, m) => mergeUnique(acc, ...(m.allergies ?? [])),
    [...familyAllergies],
  );

  // 6. Merge cuisine preferences: family first, then member additions
  const allCuisinePreferences = memberPrefs.reduce<CuisineType[]>(
    (acc, m) => mergeUnique(acc, ...(m.cuisine_preferences ?? [])),
    [...familyCuisines],
  );

  return {
    id: familyData.id ?? '',
    familyId: familyId,
    dietaryRestrictions: allDietaryRestrictions,
    allergies: allAllergies,
    cuisinePreferences: allCuisinePreferences,
    budgetRange: familyData.budget_range ?? { min: 0, max: 500, currency: 'USD' },
    createdAt: familyData.created_at ?? new Date().toISOString(),
    updatedAt: familyData.updated_at ?? new Date().toISOString(),
  };
}

// ── Soft Scoring Engine ──────────────────────────────────────────────────────

interface ScoreBreakdown {
  dietaryScore: number;
  cuisineScore: number;
  tagScore: number;
  quickMealScore: number;
  total: number;
  reasons: string[];
}

/**
 * Score a single recipe against family preferences using soft weights only.
 *
 * This function is called AFTER hard filters have excluded infeasible recipes,
 * so it only computes positive/neutral scores:
 * - Dietary match bonus: +20 for each matched dietary restriction
 *   (already confirmed compliant by the hard filter)
 * - Cuisine match bonus: +15 for preferred cuisine
 * - Tag match bonus: +5 for each matching tag
 * - Quick meal bonus: +5 for recipes ≤ 30 min total
 */
export function scoreRecipe(recipe: RecipeFull, preferences: FamilyPreferences): ScoreBreakdown {
  let dietaryScore = 0;
  let cuisineScore = 0;
  let tagScore = 0;
  let quickMealScore = 0;
  const reasons: string[] = [];

  // ── Dietary restriction bonus ──────────────────────────────────────────
  if (preferences.dietaryRestrictions.length > 0) {
    const matchedRestrictions = preferences.dietaryRestrictions.filter((restriction: string) =>
      recipe.dietary_info.some(
        (di) => toKebabCase(restriction) === di.restriction && di.is_compliant,
      ),
    );

    dietaryScore = matchedRestrictions.length * WEIGHTS.DIETARY_MATCH;

    if (matchedRestrictions.length > 0) {
      reasons.push(`Matches dietary needs: ${matchedRestrictions.join(', ')}`);
    }
  }

  // ── Cuisine preference bonus ───────────────────────────────────────────
  if (preferences.cuisinePreferences.length > 0 && recipe.cuisine) {
    const cuisineMatch = preferences.cuisinePreferences.some(
      (pref) => pref.toLowerCase() === recipe.cuisine!.toLowerCase(),
    );
    if (cuisineMatch) {
      cuisineScore = WEIGHTS.CUISINE_MATCH;
      reasons.push(`Preferred cuisine: ${recipe.cuisine}`);
    }
  }

  // ── Tag bonus ──────────────────────────────────────────────────────────
  // Bonus for recipes with tags that match dietary preferences
  if (recipe.tags.length > 0 && preferences.dietaryRestrictions.length > 0) {
    const matchingTags = recipe.tags.filter((t) =>
      preferences.dietaryRestrictions.some((dr: string) => toKebabCase(dr) === t.tag.toLowerCase()),
    );
    tagScore = matchingTags.length * WEIGHTS.TAG_MATCH;
    if (matchingTags.length > 0) {
      reasons.push(`Relevant tags: ${matchingTags.map((t) => t.tag).join(', ')}`);
    }
  }

  // ── Quick meal bonus ─────────────────────────────────────────────────────
  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  if (totalTime > 0 && totalTime <= WEIGHTS.QUICK_MEAL_THRESHOLD) {
    quickMealScore = WEIGHTS.QUICK_MEAL_BONUS;
    reasons.push(`Quick meal: ${totalTime} min total`);
  }

  const total = dietaryScore + cuisineScore + tagScore + quickMealScore;

  return {
    dietaryScore,
    cuisineScore,
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
 * Hard-then-soft pipeline:
 * 1. Fetch family preferences
 * 2. Fetch a broad pool of recipes
 * 3. HARD FILTER: exclude recipes that fail dietary, allergen, or budget filters
 * 4. SOFT SCORE: rank remaining recipes with scoreRecipe
 * 5. Sort by score descending, return top N
 */
export async function recommendRecipes(
  familyId: string,
  limit = 10,
): Promise<RecipeRecommendation[]> {
  // 1. Fetch aggregated preferences (family + member overrides)
  const preferences = await getAggregatedFamilyPreferences(familyId);

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

  // 3. HARD FILTER: exclude recipes that fail dietary, allergen, or budget filters
  const { eligible } = applyHardFilters(withRelations, preferences);

  // 4. SOFT SCORE: rank remaining recipes with scoreRecipe
  const scored: RecipeRecommendation[] = eligible.map((recipe) => {
    const breakdown = scoreRecipe(recipe, preferences);
    return {
      recipe,
      score: breakdown.total,
      reasons: breakdown.reasons,
    };
  });

  // 5. Sort by score descending and return top N
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
