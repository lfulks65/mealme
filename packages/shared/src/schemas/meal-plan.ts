/**
 * @module schemas/meal-plan
 * Zod validation schemas for MealPlan domain types.
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types/meal-plan.ts` exactly.
 */

import { z } from 'zod';
import { MEAL_SLOT_KEYS } from '../constants/meal-slots';

// ── MealPlanEntry ───────────────────────────────────────────────────────────

export const MealPlanEntrySchema = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  mealSlot: z.enum(MEAL_SLOT_KEYS as unknown as [string, ...string[]]),
  recipeId: z.string().uuid(),
  servings: z.number().int().positive(),
  note: z.string().optional(),
});

export type MealPlanEntryInput = z.infer<typeof MealPlanEntrySchema>;

// ── MealPlan ───────────────────────────────────────────────────────────────

export const MealPlanSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  entries: z.array(MealPlanEntrySchema),
  createdBy: z.string().uuid(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type MealPlanInput = z.infer<typeof MealPlanSchema>;

// ── Create / Update ────────────────────────────────────────────────────────

export const CreateMealPlanInputSchema = z.object({
  familyId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  entries: z.array(MealPlanEntrySchema.omit({ id: true })),
});

export type CreateMealPlanInputSchemaType = z.infer<typeof CreateMealPlanInputSchema>;

export const UpdateMealPlanInputSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional(),
  entries: z.array(MealPlanEntrySchema.omit({ id: true })).optional(),
});

export type UpdateMealPlanInputSchemaType = z.infer<typeof UpdateMealPlanInputSchema>;
