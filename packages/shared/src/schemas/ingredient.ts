/**
 * @module schemas/ingredient
 * Zod validation schemas for Ingredient domain types.
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types/ingredient.ts` exactly.
 */

import { z } from 'zod';
import { MEASUREMENT_UNIT_KEYS } from '../constants/measurement-units';
import { INGREDIENT_CATEGORIES } from '../types/ingredient';

// ── Enums ──────────────────────────────────────────────────────────────────

export const IngredientCategorySchema = z.enum(
  INGREDIENT_CATEGORIES as unknown as [string, ...string[]],
);

// ── Ingredient ─────────────────────────────────────────────────────────────

export const IngredientSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  category: IngredientCategorySchema,
  defaultUnit: z.enum(MEASUREMENT_UNIT_KEYS as unknown as [string, ...string[]]),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  allergens: z.array(z.string().min(1)).optional(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type IngredientInput = z.infer<typeof IngredientSchema>;
