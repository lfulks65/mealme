/**
 * @module schemas/shopping-list
 * Zod validation schemas for ShoppingList domain types.
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types/shopping-list.ts` exactly.
 */

import { z } from 'zod';
import { MEASUREMENT_UNIT_KEYS } from '../constants/measurement-units';

// ── Enums ──────────────────────────────────────────────────────────────────

export const ItemStatusSchema = z.enum(['needed', 'purchased', 'unavailable']);

// ── ShoppingListItem ────────────────────────────────────────────────────────

export const ShoppingListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.enum(MEASUREMENT_UNIT_KEYS as unknown as [string, ...string[]]),
  status: ItemStatusSchema,
  recipeIds: z.array(z.string().uuid()),
  category: z.string().min(1).optional(),
  isManual: z.boolean(),
  note: z.string().optional(),
  hebProductId: z.string().min(1).optional(),
});

export type ShoppingListItemInput = z.infer<typeof ShoppingListItemSchema>;

// ── ShoppingList ────────────────────────────────────────────────────────────

export const ShoppingListSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  mealPlanId: z.string().uuid().optional(),
  name: z.string().min(1),
  items: z.array(ShoppingListItemSchema),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type ShoppingListInput = z.infer<typeof ShoppingListSchema>;

// ── Create / Update ────────────────────────────────────────────────────────

export const CreateShoppingListInputSchema = z.object({
  familyId: z.string().uuid(),
  mealPlanId: z.string().uuid().optional(),
  name: z.string().min(1),
  items: z.array(ShoppingListItemSchema.omit({ id: true })).optional(),
});

export type CreateShoppingListInputSchemaType = z.infer<typeof CreateShoppingListInputSchema>;

export const UpdateShoppingListInputSchema = z.object({
  name: z.string().min(1).optional(),
  items: z.array(ShoppingListItemSchema.omit({ id: true })).optional(),
});

export type UpdateShoppingListInputSchemaType = z.infer<typeof UpdateShoppingListInputSchema>;
