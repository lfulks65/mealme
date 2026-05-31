/**
 * @module schemas/family
 * Zod validation schemas for Family domain types.
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types/family.ts` exactly.
 */

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const FamilyRoleSchema = z.enum(['parent', 'child', 'guardian', 'member']);

// ── FamilyMembership ────────────────────────────────────────────────────────

export const FamilyMembershipSchema = z.object({
  id: z.string().uuid(),
  familyId: z.string().uuid(),
  userId: z.string().uuid(),
  role: FamilyRoleSchema,
  createdAt: z.string().datetime({ offset: true }),
});

export type FamilyMembershipInput = z.infer<typeof FamilyMembershipSchema>;

// ── Family ─────────────────────────────────────────────────────────────────

export const FamilySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  orgId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type FamilyInput = z.infer<typeof FamilySchema>;
