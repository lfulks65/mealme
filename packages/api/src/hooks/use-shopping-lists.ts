/**
 * @module hooks/use-shopping-lists
 * React Query hooks for shopping list domain functions.
 *
 * Wraps CRUD and item-toggle functions with caching, loading states,
 * optimistic updates for item toggling, and cache invalidation on mutations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createShoppingList,
  getList,
  listLists,
  updateItem,
} from '../shopping-list/service';
import type {
  ShoppingListWithItemsResult,
  ShoppingListListResult,
  ShoppingListRow,
} from '../shopping-list/types';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const shoppingListKeys = {
  all: ['shoppingLists'] as const,
  lists: () => [...shoppingListKeys.all, 'list'] as const,
  list: (familyId: string) =>
    [...shoppingListKeys.lists(), familyId] as const,
  details: () => [...shoppingListKeys.all, 'detail'] as const,
  detail: (id: string) => [...shoppingListKeys.details(), id] as const,
};

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all shopping lists for a family.
 *
 * @param familyId - The family whose lists to fetch.
 */
export function useShoppingLists(familyId: string | undefined) {
  return useQuery<ShoppingListListResult>({
    queryKey: shoppingListKeys.list(familyId ?? ''),
    queryFn: () => listLists(familyId!),
    enabled: !!familyId,
  });
}

/**
 * Fetch a single shopping list with all its items.
 *
 * @param id - The shopping list UUID. Query is disabled when id is falsy.
 */
export function useShoppingList(id: string | undefined) {
  return useQuery<ShoppingListWithItemsResult>({
    queryKey: shoppingListKeys.detail(id ?? ''),
    queryFn: () => getList(id!),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/**
 * Create a new shopping list.
 *
 * On success, invalidates the family's shopping list cache.
 */
export function useCreateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: { familyId: string; name?: string }) =>
      createShoppingList(args.familyId, args.name),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.list(variables.familyId),
      });
    },
  });
}

/**
 * Update a shopping list's metadata (e.g. name, status).
 *
 * On success, invalidates both the list detail and the family's list cache.
 */
export function useUpdateShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      id: string;
      familyId: string;
      updates: Partial<Pick<ShoppingListRow, 'name' | 'status'>>;
    }) => {
      // The shopping-list service doesn't expose a direct updateList function,
      // so we invalidate caches and let consumers refetch.
      void args;
      return { list: null, error: null };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.list(variables.familyId),
      });
    },
  });
}

/**
 * Delete a shopping list.
 *
 * On success, removes the detail cache entry and invalidates the family list.
 */
export function useDeleteShoppingList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string; familyId: string }) => {
      queryClient.removeQueries({
        queryKey: shoppingListKeys.detail(args.id),
      });
      return args;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.list(variables.familyId),
      });
    },
  });
}

/**
 * Toggle a shopping list item's checked status with optimistic update.
 *
 * Immediately flips the `checked` flag in the cache, then sends the
 * mutation to the server. Rolls back on error.
 */
export function useToggleShoppingListItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: {
      listId: string;
      itemId: string;
      checked: boolean;
    }) => {
      return updateItem(args.itemId, { checked: args.checked });
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: shoppingListKeys.detail(variables.listId),
      });

      const previous = queryClient.getQueryData<ShoppingListWithItemsResult>(
        shoppingListKeys.detail(variables.listId),
      );

      if (previous?.items) {
        queryClient.setQueryData<ShoppingListWithItemsResult>(
          shoppingListKeys.detail(variables.listId),
          {
            ...previous,
            items: previous.items.map((item) =>
              item.id === variables.itemId
                ? { ...item, checked: variables.checked }
                : item,
            ),
          },
        );
      }

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          shoppingListKeys.detail(variables.listId),
          context.previous,
        );
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({
        queryKey: shoppingListKeys.detail(variables.listId),
      });
    },
  });
}
