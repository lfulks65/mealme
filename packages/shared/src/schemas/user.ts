/**
 * @module schemas/user
 * Zod validation schemas for User domain types.
 *
 * Each schema mirrors its corresponding TypeScript type in
 * `src/types/user.ts` exactly.
 */

import { z } from 'zod';

// ── Enums ──────────────────────────────────────────────────────────────────

export const AuthProviderSchema = z.enum(['email', 'google', 'apple', 'facebook']);

// ── User ────────────────────────────────────────────────────────────────────

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().optional(),
  authProviders: z.array(AuthProviderSchema),
  familyIds: z.array(z.string().uuid()),
  active: z.boolean(),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type UserInput = z.infer<typeof UserSchema>;

// ── Create / Update ────────────────────────────────────────────────────────

export const CreateUserInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1),
  password: z.string().min(1).optional(),
  authProvider: AuthProviderSchema,
});

export type CreateUserInputSchemaType = z.infer<typeof CreateUserInputSchema>;

export const UpdateUserInputSchema = z.object({
  displayName: z.string().min(1).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateUserInputSchemaType = z.infer<typeof UpdateUserInputSchema>;
