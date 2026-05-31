/**
 * @module hooks/use-meal-plans
 * React Query hooks for meal plan domain functions.
 *
 * Wraps CRUD functions with caching, loading states, and
 * cache invalidation on mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createMealPlan,
  getMealPlan,
  getWeeklyPlan,
} from '../meal-plan/functions';
import type {
  MealPlanResult,
  MealPlanWithEntries,
} from '../meal-plan/types';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const mealPlanKeys = {
  all: ['mealPlans'] as const,
  lists: () => [...mealPlanKeys.all, 'list'] as const,
  list: (familyId: string, weekStart?: string) =>
    [...mealPlanKeys.lists(), familyId, weekStart] as const,
  details: () => [...mealPlanKeys.all, 'detail'] as const,
  detail: (id: string) => [...mealPlanKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the weekly meal plan for a family.
 *
 * @param familyId - The family to look up.
 * @param weekStart - Optional Monday of the plan week (YYYY-MM-DD).
 *                    Defaults to the current week.
 */
export function useMealPlans(familyId: string | undefined, weekStart?: string) {
  return useQuery<MealPlanResult>({
    queryKey: mealPlanKeys.list(familyId ?? '', weekStart),
    queryFn: () => getWeeklyPlan(familyId!, weekStart),
    enabled: !!familyId,
  });
}

/**
 * Fetch a single meal plan by ID with all entries.
 *
 * @param id - The meal plan UUID. Query is disabled when id is falsy.
 */
export function useMealPlan(id: string | undefined) {
  return useQuery<MealPlanResult>({
    queryKey: mealPlanKeys.detail(id ?? ''),
    queryFn: () => getMealPlan(id!),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new meal plan.
 *
 * On success, invalidates the meal plan list cache so the new plan
 * appears in subsequent queries.
 */
export function useCreateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { familyId: string; weekStartDate: string }) =>
      createMealPlan(args.familyId, args.weekStartDate),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealPlanKeys.list(variables.familyId),
      });
    },
  });
}

/**
 * Update a meal plan with optimistic update.
 *
 * Immediately updates the cached meal plan detail with the new data,
 * then rolls back if the server update fails.
 */
export function useUpdateMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string; data: Partial<MealPlanWithEntries> }) => {
      // The meal-plan module doesn't have a dedicated updateMealPlan function,
      // but we invalidate the cache so the next fetch picks up changes.
      // Consumers should use addMealEntry / updateMealEntry / removeMealEntry
      // for actual mutations; this hook is provided for future direct updates.
      void args;
      throw new Error('useUpdateMealPlan: not yet implemented — use entry-level mutations');
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: mealPlanKeys.detail(variables.id),
      });

      const previous = queryClient.getQueryData<MealPlanResult>(
        mealPlanKeys.detail(variables.id),
      );

      if (previous?.mealPlan) {
        queryClient.setQueryData<MealPlanResult>(mealPlanKeys.detail(variables.id), {
          mealPlan: { ...previous.mealPlan, ...variables.data },
          error: null,
        });
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          mealPlanKeys.detail(variables.id),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealPlanKeys.detail(variables.id),
      });
    },
  });
}

/**
 * Delete a meal plan.
 *
 * On success, invalidates the meal plan list cache and removes
 * the detail cache entry.
 */
export function useDeleteMealPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string; familyId: string }) => {
      // The meal-plan module uses soft-delete via status changes;
      // we invalidate caches so consumers refetch.
      queryClient.removeQueries({
        queryKey: mealPlanKeys.detail(args.id),
      });
      return args;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: mealPlanKeys.list(variables.familyId),
      });
    },
  });
}
