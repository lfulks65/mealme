/**
 * @module hooks/use-preferences
 * React Query hooks for preferences domain functions.
 *
 * Wraps family and member preference CRUD with caching, loading states,
 * optimistic updates, and cache invalidation on mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getFamilyPreferences,
  upsertFamilyPreferences,
  getMemberPreferences,
  upsertMemberPreferences,
} from '../preferences/functions';
import type {
  FamilyPreferencesResult,
  MemberPreferencesResult,
  UpsertFamilyPreferencesInput,
  UpsertMemberPreferencesInput,
} from '../preferences/types';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const preferenceKeys = {
  all: ['preferences'] as const,
  family: (familyId: string) =>
    [...preferenceKeys.all, 'family', familyId] as const,
  member: (familyId: string, userId: string) =>
    [...preferenceKeys.all, 'member', familyId, userId] as const,
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch family preferences for a given family.
 *
 * @param familyId - The family whose preferences to fetch.
 */
export function useFamilyPreferences(familyId: string | undefined) {
  return useQuery<FamilyPreferencesResult>({
    queryKey: preferenceKeys.family(familyId ?? ''),
    queryFn: () => getFamilyPreferences(familyId!),
    enabled: !!familyId,
  });
}

/**
 * Fetch member preferences for a specific user within a family.
 *
 * @param familyId - The family context.
 * @param userId - The user whose preferences to fetch.
 */
export function useUserPreferences(
  familyId: string | undefined,
  userId: string | undefined,
) {
  return useQuery<MemberPreferencesResult>({
    queryKey: preferenceKeys.member(familyId ?? '', userId ?? ''),
    queryFn: () => getMemberPreferences(familyId!, userId!),
    enabled: !!familyId && !!userId,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Upsert family preferences with optimistic update.
 *
 * Immediately updates the cached family preferences with the new data,
 * then sends the mutation to the server. Rolls back on error.
 */
export function useUpdateFamilyPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      familyId: string;
      input: UpsertFamilyPreferencesInput;
    }) => upsertFamilyPreferences(args.familyId, args.input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: preferenceKeys.family(variables.familyId),
      });

      const previous = queryClient.getQueryData<FamilyPreferencesResult>(
        preferenceKeys.family(variables.familyId),
      );

      if (previous?.preferences) {
        queryClient.setQueryData<FamilyPreferencesResult>(
          preferenceKeys.family(variables.familyId),
          {
            preferences: {
              ...previous.preferences,
              ...mapFamilyInputToRow(variables.input),
            },
            error: null,
          },
        );
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          preferenceKeys.family(variables.familyId),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.family(variables.familyId),
      });
    },
  });
}

/**
 * Upsert member preferences with optimistic update.
 *
 * Immediately updates the cached member preferences with the new data,
 * then sends the mutation to the server. Rolls back on error.
 */
export function useUpdateUserPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: {
      familyId: string;
      userId: string;
      input: UpsertMemberPreferencesInput;
    }) => upsertMemberPreferences(args.familyId, args.userId, args.input),
    onMutate: async (variables) => {
      const key = preferenceKeys.member(variables.familyId, variables.userId);

      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<MemberPreferencesResult>(key);

      if (previous?.preferences) {
        queryClient.setQueryData<MemberPreferencesResult>(key, {
          preferences: {
            ...previous.preferences,
            ...mapMemberInputToRow(variables.input),
          },
          error: null,
        });
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          preferenceKeys.member(variables.familyId, variables.userId),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.member(variables.familyId, variables.userId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map camelCase input fields to snake_case row fields for optimistic update.
 */
function mapFamilyInputToRow(
  input: UpsertFamilyPreferencesInput,
): Partial<Record<string, unknown>> {
  const mapped: Record<string, unknown> = {};

  if (input.dietaryRestrictions !== undefined) {
    mapped.dietary_restrictions = input.dietaryRestrictions;
  }
  if (input.allergies !== undefined) {
    mapped.allergies = input.allergies;
  }
  if (input.cuisinePreferences !== undefined) {
    mapped.cuisine_preferences = input.cuisinePreferences;
  }
  if (input.budgetTier !== undefined) {
    mapped.budget_tier = input.budgetTier;
  }
  if (input.householdSize !== undefined) {
    mapped.household_size = input.householdSize;
  }
  if (input.notes !== undefined) {
    mapped.notes = input.notes;
  }

  return mapped;
}

/**
 * Map camelCase input fields to snake_case row fields for optimistic update.
 */
function mapMemberInputToRow(
  input: UpsertMemberPreferencesInput,
): Partial<Record<string, unknown>> {
  const mapped: Record<string, unknown> = {};

  if (input.dietaryRestrictions !== undefined) {
    mapped.dietary_restrictions = input.dietaryRestrictions;
  }
  if (input.allergies !== undefined) {
    mapped.allergies = input.allergies;
  }
  if (input.cuisinePreferences !== undefined) {
    mapped.cuisine_preferences = input.cuisinePreferences;
  }
  if (input.isOverride !== undefined) {
    mapped.is_override = input.isOverride;
  }

  return mapped;
}
