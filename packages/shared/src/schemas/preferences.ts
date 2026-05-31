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
import { ALLERGY_IDS } from '../constants/allergies';

// ── BudgetRange ─────────────────────────────────────────────────────────────

export const BudgetRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  currency: z.string().default('USD'),
});

export type BudgetRangeInput = z.infer<typeof BudgetRangeSchema>;

// ── FamilyPreferences ───────────────────────────────────────────────────────

export const FamilyPreferencesSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  dietaryRestrictions: z.array(
    z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]),
  ),
  allergies: z.array(z.enum(ALLERGY_IDS as unknown as [string, ...string[]])),
  cuisinePreferences: z.array(z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]])),
  budgetRange: BudgetRangeSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type FamilyPreferencesInput = z.infer<typeof FamilyPreferencesSchema>;

// ── MemberPreferences ───────────────────────────────────────────────────────

export const MemberPreferencesSchema = z.object({
  id: z.string().uuid(),
  memberId: z.string().uuid(),
  dietaryRestrictions: z.array(
    z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]),
  ),
  allergies: z.array(z.enum(ALLERGY_IDS as unknown as [string, ...string[]])),
  cuisinePreferences: z.array(z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]])),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type MemberPreferencesInput = z.infer<typeof MemberPreferencesSchema>;

// ── Update Input Schemas ────────────────────────────────────────────────────

export const UpdateFamilyPreferencesInputSchema = z.object({
  dietaryRestrictions: z
    .array(z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]))
    .optional(),
  allergies: z.array(z.enum(ALLERGY_IDS as unknown as [string, ...string[]])).optional(),
  cuisinePreferences: z
    .array(z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]]))
    .optional(),
  budgetRange: BudgetRangeSchema.optional(),
});

export type UpdateFamilyPreferencesInputSchemaType = z.infer<
  typeof UpdateFamilyPreferencesInputSchema
>;

export const UpdateMemberPreferencesInputSchema = z.object({
  dietaryRestrictions: z
    .array(z.enum(DIETARY_RESTRICTION_KEYS as unknown as [string, ...string[]]))
    .optional(),
  allergies: z.array(z.enum(ALLERGY_IDS as unknown as [string, ...string[]])).optional(),
  cuisinePreferences: z
    .array(z.enum(CUISINE_TYPE_KEYS as unknown as [string, ...string[]]))
    .optional(),
});

export type UpdateMemberPreferencesInputSchemaType = z.infer<
  typeof UpdateMemberPreferencesInputSchema
>;
