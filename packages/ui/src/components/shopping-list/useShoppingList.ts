/**
 * useShoppingList — hook for shopping list data fetching and mutations.
 *
 * Provides state management for a shopping list including:
 *   - Fetching list with items from the API
 *   - Checking/unchecking items
 *   - Deleting items
 *   - Updating item quantities
 *   - Adding custom items
 *   - Computed progress (percentage checked off)
 *   - Items grouped by category
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ShoppingItemCategory,
  ShoppingListItemRow,
  ShoppingListRow,
} from '@mealme/api';

// ─── Category metadata ──────────────────────────────────────────────────────

export const CATEGORY_META: Record<
  ShoppingItemCategory,
  { label: string; emoji: string; order: number }
> = {
  produce: { label: 'Produce', emoji: '🥬', order: 0 },
  dairy: { label: 'Dairy', emoji: '🧀', order: 1 },
  meat: { label: 'Meat & Seafood', emoji: '🥩', order: 2 },
  bakery: { label: 'Bakery', emoji: '🍞', order: 3 },
  frozen: { label: 'Frozen', emoji: '🧊', order: 4 },
  pantry: { label: 'Pantry', emoji: '🫙', order: 5 },
  other: { label: 'Other', emoji: '📦', order: 6 },
};

export const CATEGORY_ORDER: ShoppingItemCategory[] = [
  'produce',
  'dairy',
  'meat',
  'bakery',
  'frozen',
  'pantry',
  'other',
];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ShoppingListState {
  list: ShoppingListRow | null;
  items: ShoppingListItemRow[];
  loading: boolean;
  error: string | null;
}

export interface CategorizedItems {
  category: ShoppingItemCategory;
  label: string;
  emoji: string;
  items: ShoppingListItemRow[];
}

export interface UseShoppingListResult extends ShoppingListState {
  /** Items grouped by category, sorted by category order */
  categorizedItems: CategorizedItems[];
  /** Percentage of items checked off (0–100) */
  progressPercent: number;
  /** Number of checked items */
  checkedCount: number;
  /** Total number of items */
  totalCount: number;
  /** Toggle an item's checked status */
  toggleItem: (itemId: string) => void;
  /** Remove an item from the list */
  deleteItem: (itemId: string) => void;
  /** Update an item's quantity */
  updateQuantity: (itemId: string, quantity: number) => void;
  /** Add a custom item */
  addCustomItem: (name: string, quantity: number, unit: string, category?: ShoppingItemCategory) => void;
  /** Refresh the list from the API */
  refresh: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useShoppingList(
  listId: string | null,
): UseShoppingListResult {
  const [state, setState] = useState<ShoppingListState>({
    list: null,
    items: [],
    loading: false,
    error: null,
  });

  // Fetch the list
  const fetchList = useCallback(async () => {
    if (!listId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      // Dynamic import to avoid requiring @mealme/api at module level
      // (supports both web and native bundlers)
      const { getList } = await import('@mealme/api');
      const result = await getList(listId);
      if (result.error) {
        setState({ list: null, items: [], loading: false, error: result.error });
      } else {
        setState({
          list: result.list,
          items: result.items,
          loading: false,
          error: null,
        });
      }
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err?.message ?? 'Failed to fetch shopping list',
      }));
    }
  }, [listId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Toggle item checked status
  const toggleItem = useCallback(
    async (itemId: string) => {
      const item = state.items.find((i) => i.id === itemId);
      if (!item) return;

      // Optimistic update
      setState((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, checked: !i.checked } : i,
        ),
      }));

      try {
        const { updateItem } = await import('@mealme/api');
        await updateItem(itemId, { checked: !item.checked });
      } catch {
        // Revert on failure
        setState((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, checked: item.checked } : i,
          ),
        }));
      }
    },
    [state.items],
  );

  // Delete item
  const deleteItem = useCallback(
    async (itemId: string) => {
      const prevItems = state.items;
      // Optimistic update
      setState((prev) => ({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
      }));

      try {
        const { removeItem } = await import('@mealme/api');
        await removeItem(itemId);
      } catch {
        // Revert on failure
        setState((prev) => ({ ...prev, items: prevItems }));
      }
    },
    [state.items],
  );

  // Update quantity
  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity <= 0) return;

      const prevItem = state.items.find((i) => i.id === itemId);
      if (!prevItem) return;

      // Optimistic update
      setState((prev) => ({
        ...prev,
        items: prev.items.map((i) =>
          i.id === itemId ? { ...i, quantity } : i,
        ),
      }));

      try {
        const { updateItem } = await import('@mealme/api');
        await updateItem(itemId, { quantity });
      } catch {
        // Revert on failure
        setState((prev) => ({
          ...prev,
          items: prev.items.map((i) =>
            i.id === itemId ? { ...i, quantity: prevItem.quantity } : i,
          ),
        }));
      }
    },
    [state.items],
  );

  // Add custom item
  const addCustomItem = useCallback(
    async (
      name: string,
      quantity: number,
      unit: string,
      category?: ShoppingItemCategory,
    ) => {
      if (!listId || !name.trim()) return;

      try {
        const { addItem } = await import('@mealme/api');
        const result = await addItem(listId, {
          ingredientName: name.trim(),
          quantity,
          unit,
          category: category ?? 'other',
        });

        if (result.item) {
          setState((prev) => ({
            ...prev,
            items: [...prev.items, result.item!],
          }));
        }
      } catch {
        // Silently fail — the user can try again
      }
    },
    [listId],
  );

  // Computed: categorized items
  const categorizedItems = useMemo<CategorizedItems[]>(() => {
    const groups = new Map<ShoppingItemCategory, ShoppingListItemRow[]>();

    for (const item of state.items) {
      const cat = item.category ?? 'other';
      if (!groups.has(cat)) {
        groups.set(cat, []);
      }
      groups.get(cat)!.push(item);
    }

    return CATEGORY_ORDER.filter((cat) => groups.has(cat)).map((cat) => ({
      category: cat,
      label: CATEGORY_META[cat].label,
      emoji: CATEGORY_META[cat].emoji,
      items: groups.get(cat) ?? [],
    }));
  }, [state.items]);

  // Computed: progress
  const checkedCount = useMemo(
    () => state.items.filter((i) => i.checked).length,
    [state.items],
  );
  const totalCount = state.items.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((checkedCount / totalCount) * 100);

  return {
    ...state,
    categorizedItems,
    progressPercent,
    checkedCount,
    totalCount,
    toggleItem,
    deleteItem,
    updateQuantity,
    addCustomItem,
    refresh: fetchList,
  };
}

export default useShoppingList;
