/**
 * @module hooks/use-family
 * React Query hooks for family domain functions.
 *
 * Wraps family CRUD and member management functions with caching,
 * loading states, and cache invalidation on mutations.
 *
 * Note: The family context's `useFamily` hook (from ../family/context) is
 * a separate React context hook for family state management. The hooks
 * here are React Query–based and are prefixed with `useFamilyQuery` to
 * avoid naming conflicts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createFamily,
  getFamily,
  listFamilies,
  updateFamily,
  addFamilyMember,
  removeFamilyMember,
} from '../family/functions';
import type {
  FamilyResult,
  FamilyListResult,
  CreateFamilyInput,
  UpdateFamilyInput,
  AddFamilyMemberInput,
} from '../family/types';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const familyKeys = {
  all: ['families'] as const,
  lists: () => [...familyKeys.all, 'list'] as const,
  list: (orgId: string) => [...familyKeys.lists(), orgId] as const,
  details: () => [...familyKeys.all, 'detail'] as const,
  detail: (id: string) => [...familyKeys.details(), id] as const,
  members: (familyId: string) =>
    [...familyKeys.all, 'members', familyId] as const,
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * List all families in an organization where the current user is a member.
 *
 * @param orgId - The organization to scope families to.
 */
export function useFamilies(orgId: string | undefined) {
  return useQuery<FamilyListResult>({
    queryKey: familyKeys.list(orgId ?? ''),
    queryFn: () => listFamilies(orgId!),
    enabled: !!orgId,
  });
}

/**
 * Fetch a single family by ID, including the current user's role.
 *
 * @param id - The family UUID. Query is disabled when id is falsy.
 */
export function useFamilyQuery(id: string | undefined) {
  return useQuery<FamilyResult>({
    queryKey: familyKeys.detail(id ?? ''),
    queryFn: () => getFamily(id!),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new family.
 *
 * On success, invalidates the family list cache for the organization.
 */
export function useCreateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFamilyInput) => createFamily(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: familyKeys.list(variables.orgId),
      });
    },
  });
}

/**
 * Update a family's name.
 *
 * On success, invalidates both the family detail and the family list caches.
 */
export function useUpdateFamily() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { id: string; input: UpdateFamilyInput }) =>
      updateFamily(args.id, args.input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: familyKeys.detail(variables.id),
      });
      // Invalidate all family lists since the name may have changed
      queryClient.invalidateQueries({
        queryKey: familyKeys.lists(),
      });
    },
  });
}

/**
 * Invite (add) a member to a family.
 *
 * On success, invalidates the family members cache.
 */
export function useInviteFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddFamilyMemberInput) => addFamilyMember(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: familyKeys.members(variables.familyId),
      });
    },
  });
}

/**
 * Remove a member from a family.
 *
 * On success, invalidates the family members cache.
 */
export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { familyId: string; userId: string }) =>
      removeFamilyMember(args.familyId, args.userId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: familyKeys.members(variables.familyId),
      });
    },
  });
}
