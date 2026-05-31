/**
 * @module schemas/recipe
 * Zod validation schemas for Recipe domain types.
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types/recipe.ts` exactly, enabling runtime validation
 * and type-safe parsing.
 */

import { z } from 'zod';
import { DIETARY_RESTRICTION_KEYS } from '../constants/dietary-restrictions';
import { CUISINE_TYPE_KEYS } from '../constants/cuisine-types';
import { MEASUREMENT_UNIT_KEYS } from '../constants/measurement-units';

// ── Enums ──────────────────────────────────────────────────────────────────

export const RecipeDifficultySchema = z.enum(['easy', 'medium', 'hard']);

// ── Ingredient ─────────────────────────────────────────────────────────────

export const RecipeIngredientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(MEASUREMENT_UNIT_KEYS as unknown as [string, ...string[]]),
  preparation: z.string().optional(),
  optional: z.boolean().optional(),
});

export type RecipeIngredientInput = z.infer<typeof RecipeIngredientSchema>;

// ── Step ───────────────────────────────────────────────────────────────────

export const RecipeStepSchema = z.object({
  step: z.number().int().positive(),
  instruction: z.string().min(1),
  durationMinutes: z.number().int().positive().optional(),
  mediaUrl: z.string().url().optional(),
});

export type RecipeStepInput = z.infer<typeof RecipeStepSchema>;

// ── Nutrition ──────────────────────────────────────────────────────────────

export const NutritionInfoSchema = z.object({
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  fiber: z.number().nonnegative().optional(),
  sugar: z.number().nonnegative().optional(),
  sodium: z.number().nonnegative().optional(),
});

export type NutritionInfoInput = z.infer<typeof NutritionInfoSchema>;

// ── Recipe ─────────────────────────────────────────────────────────────────

export const RecipeSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  familyId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  ingredients: z.array(RecipeIngredientSchema),
  steps: z.array(RecipeStepSchema),
  servings: z.number().int().positive(),
  prepTimeMinutes: z.number().int().nonnegative(),
  cookTimeMinutes: z.number().int().nonnegative(),
  difficulty: RecipeDifficultySchema,
  nutrition: NutritionInfoSchema.optional(),
  dietaryTags: z.array(
    z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]),
  ),
  cuisineType: z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]]).optional(),
  imageUrls: z.array(z.string().url()),
  isLibrary: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type RecipeInput = z.infer<typeof RecipeSchema>;

// ── Create / Update ────────────────────────────────────────────────────────

export const CreateRecipeInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  familyId: z.string().uuid().optional(),
  ingredients: z.array(RecipeIngredientSchema.omit({ id: true })),
  steps: z.array(RecipeStepSchema.omit({ step: true })),
  servings: z.number().int().positive(),
  prepTimeMinutes: z.number().int().nonnegative(),
  cookTimeMinutes: z.number().int().nonnegative(),
  difficulty: RecipeDifficultySchema,
  nutrition: NutritionInfoSchema.optional(),
  dietaryTags: z.array(
    z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]),
  ),
  cuisineType: z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]]).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

export type CreateRecipeInputSchemaType = z.infer<typeof CreateRecipeInputSchema>;

export const UpdateRecipeInputSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  ingredients: z.array(RecipeIngredientSchema.omit({ id: true })).optional(),
  steps: z.array(RecipeStepSchema.omit({ step: true })).optional(),
  servings: z.number().int().positive().optional(),
  prepTimeMinutes: z.number().int().nonnegative().optional(),
  cookTimeMinutes: z.number().int().nonnegative().optional(),
  difficulty: RecipeDifficultySchema.optional(),
  nutrition: NutritionInfoSchema.optional(),
  dietaryTags: z.array(
    z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]),
  ).optional(),
  cuisineType: z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]]).optional(),
  imageUrls: z.array(z.string().url()).optional(),
});

export type UpdateRecipeInputSchemaType = z.infer<typeof UpdateRecipeInputSchema>;
