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
  updateFamilyPreferences,
  getMemberPreferences,
  updateMemberPreferences,
} from '../preferences/functions';
import type {
  FamilyPreferencesResult,
  MemberPreferencesResult,
  FamilyPreferencesInput,
  MemberPreferencesInput,
} from '../preferences/types';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const preferenceKeys = {
  all: ['preferences'] as const,
  family: (familyId: string) => [...preferenceKeys.all, 'family', familyId] as const,
  member: (memberId: string) => [...preferenceKeys.all, 'member', memberId] as const,
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
 * Fetch member preferences for a specific family member.
 *
 * @param memberId - The family member whose preferences to fetch.
 */
export function useMemberPreferences(memberId: string | undefined) {
  return useQuery<MemberPreferencesResult>({
    queryKey: preferenceKeys.member(memberId ?? ''),
    queryFn: () => getMemberPreferences(memberId!),
    enabled: !!memberId,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Update family preferences with optimistic update.
 *
 * Immediately updates the cached family preferences with the new data,
 * then sends the mutation to the server. Rolls back on error.
 */
export function useUpdateFamilyPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { familyId: string; input: FamilyPreferencesInput }) =>
      updateFamilyPreferences(args.familyId, args.input),
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
              ...mapFamilyInputToDomain(variables.input),
            },
            error: null,
          },
        );
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(preferenceKeys.family(variables.familyId), context.previous);
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
 * Update member preferences with optimistic update.
 *
 * Immediately updates the cached member preferences with the new data,
 * then sends the mutation to the server. Rolls back on error.
 */
export function useUpdateMemberPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { memberId: string; input: MemberPreferencesInput }) =>
      updateMemberPreferences(args.memberId, args.input),
    onMutate: async (variables) => {
      const key = preferenceKeys.member(variables.memberId);

      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<MemberPreferencesResult>(key);

      if (previous?.preferences) {
        queryClient.setQueryData<MemberPreferencesResult>(key, {
          preferences: {
            ...previous.preferences,
            ...mapMemberInputToDomain(variables.input),
          },
          error: null,
        });
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(preferenceKeys.member(variables.memberId), context.previous);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: preferenceKeys.member(variables.memberId),
      });
    },
  });
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases
// ---------------------------------------------------------------------------

/** @deprecated Use useMemberPreferences instead. */
export const useUserPreferences = useMemberPreferences;

/** @deprecated Use useUpdateMemberPreferences instead. */
export const useUpdateUserPreferences = useUpdateMemberPreferences;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map camelCase input fields to domain object fields for optimistic update.
 */
function mapFamilyInputToDomain(input: FamilyPreferencesInput): Partial<Record<string, unknown>> {
  const mapped: Record<string, unknown> = {};

  if (input.dietaryRestrictions !== undefined) {
    mapped.dietaryRestrictions = input.dietaryRestrictions;
  }
  if (input.allergies !== undefined) {
    mapped.allergies = input.allergies;
  }
  if (input.cuisinePreferences !== undefined) {
    mapped.cuisinePreferences = input.cuisinePreferences;
  }
  if (input.budgetRange !== undefined) {
    mapped.budgetRange = input.budgetRange;
  }

  return mapped;
}

/**
 * Map camelCase input fields to domain object fields for optimistic update.
 */
function mapMemberInputToDomain(input: MemberPreferencesInput): Partial<Record<string, unknown>> {
  const mapped: Record<string, unknown> = {};

  if (input.dietaryRestrictions !== undefined) {
    mapped.dietaryRestrictions = input.dietaryRestrictions;
  }
  if (input.allergies !== undefined) {
    mapped.allergies = input.allergies;
  }
  if (input.cuisinePreferences !== undefined) {
    mapped.cuisinePreferences = input.cuisinePreferences;
  }

  return mapped;
}
