/**
 * @module schemas/preferences
 * Zod validation schemas for preference domain types.
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types/preferences.ts` exactly.
 */

import { z } from 'zod';
import { DIETARY_RESTRICTION_KEYS } from '../constants/dietary-restrictions';
import { CUISINE_TYPE_KEYS } from '../constants/cuisine-types';
import { BUDGET_TIER_KEYS } from '../constants/budget-tiers';
import { MEAL_SLOT_KEYS } from '../constants/meal-slots';

// ── FamilyPreferences ───────────────────────────────────────────────────────

export const FamilyPreferencesSchema = z.object({
  familyId: z.string().uuid(),
  dietaryRestrictions: z.array(
    z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]),
  ),
  preferredCuisines: z.array(
    z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]]),
  ),
  budgetTier: z.enum(BUDGET_TIER_KEYS as unknown as [string, ...string[]]),
  customWeeklyBudget: z.number().positive().optional(),
  maxServingsPerMeal: z.number().int().positive(),
  activeMealSlots: z.array(
    z.enum(MEAL_SLOT_KEYS as unknown as [string, ...string[]]),
  ),
  maxWeeknightPrepMinutes: z.number().int().positive().optional(),
  includeLibraryRecipes: z.boolean(),
  excludedIngredients: z.array(z.string().min(1)),
  updatedAt: z.string().datetime({ offset: true }),
});

export type FamilyPreferencesInput = z.infer<typeof FamilyPreferencesSchema>;

// ── UserPreferences ─────────────────────────────────────────────────────────

export const UserPreferencesSchema = z.object({
  userId: z.string().uuid(),
  familyId: z.string().uuid(),
  dietaryRestrictions: z.array(
    z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]),
  ),
  dislikedIngredients: z.array(z.string().min(1)),
  preferredCuisines: z.array(
    z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]]),
  ).optional(),
  updatedAt: z.string().datetime({ offset: true }),
});

export type UserPreferencesInput = z.infer<typeof UserPreferencesSchema>;
