/**
 * @module useMealPlan
 * React hooks for meal plan CRUD and AI proposal generation.
 *
 * Wraps the @mealme/api meal-plan functions with React state
 * management for use in UI components.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type {
  MealPlanWithEntries,
  MealPlanResult,
  MealPlanProposalResult,
} from '@mealme/api';
import type { MealSlot } from '@mealme/shared';
import {
  getWeeklyPlan,
  createMealPlan,
  addMealEntry,
  removeMealEntry,
  updateMealEntry,
  generatePlanProposal,
} from '@mealme/api';

// ---------------------------------------------------------------------------
// useWeeklyMealPlan
// ---------------------------------------------------------------------------

interface UseWeeklyMealPlanReturn {
  mealPlan: MealPlanWithEntries | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  assignRecipe: (date: string, mealSlot: MealSlot, recipeId: string, servings?: number) => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
  moveEntry: (entryId: string, newDate: string, newMealSlot: MealSlot) => Promise<void>;
  generateProposal: (familyId: string, weekStartDate: string) => Promise<MealPlanProposalResult>;
}

/**
 * Hook for managing a weekly meal plan.
 *
 * Fetches the plan for a given family and week, and provides
 * methods for assigning, removing, and moving recipes between slots.
 *
 * @param familyId - The family ID to fetch plans for.
 * @param weekStartDate - The Monday of the plan week (YYYY-MM-DD).
 * @param initialMealPlan - Optional server-fetched data to use as initial state
 *   instead of fetching on mount. When provided, the initial fetch is skipped.
 */
export function useWeeklyMealPlan(
  familyId: string | null,
  weekStartDate: string,
  initialMealPlan?: MealPlanWithEntries | null,
): UseWeeklyMealPlanReturn {
  const [mealPlan, setMealPlan] = useState<MealPlanWithEntries | null>(initialMealPlan ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      const result: MealPlanResult = await getWeeklyPlan(familyId, weekStartDate);
      if (result.error) {
        setError(result.error);
      } else {
        setMealPlan(result.mealPlan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meal plan');
    } finally {
      setLoading(false);
    }
  }, [familyId, weekStartDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const assignRecipe = useCallback(
    async (date: string, mealSlot: MealSlot, recipeId: string, servings?: number) => {
      if (!mealPlan) {
        // Need to create a plan first
        if (!familyId) return;
        const createResult = await createMealPlan(familyId, weekStartDate);
        if (createResult.error || !createResult.mealPlan) {
          setError(createResult.error ?? 'Failed to create meal plan');
          return;
        }
        setMealPlan(createResult.mealPlan);
        const addResult = await addMealEntry(
          createResult.mealPlan.id,
          date,
          mealSlot,
          recipeId,
          servings,
        );
        if (addResult.error) {
          setError(addResult.error);
          return;
        }
        await refresh();
        return;
      }

      const addResult = await addMealEntry(mealPlan.id, date, mealSlot, recipeId, servings);
      if (addResult.error) {
        setError(addResult.error);
        return;
      }
      await refresh();
    },
    [mealPlan, familyId, weekStartDate, refresh],
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      const result = await removeMealEntry(entryId);
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const moveEntry = useCallback(
    async (entryId: string, newDate: string, newMealSlot: MealSlot) => {
      const result = await updateMealEntry(entryId, {
        date: newDate,
        mealSlot: newMealSlot,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      await refresh();
    },
    [refresh],
  );

  const generateProposalFn = useCallback(
    async (famId: string, weekStart: string): Promise<MealPlanProposalResult> => {
      setLoading(true);
      setError(null);
      try {
        const result = await generatePlanProposal(famId, weekStart);
        if (result.error) {
          setError(result.error);
        } else if (result.mealPlan) {
          setMealPlan(result.mealPlan);
        }
        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to generate proposal';
        setError(msg);
        return { mealPlan: null, error: msg };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    mealPlan,
    loading,
    error,
    refresh,
    assignRecipe,
    removeEntry,
    moveEntry,
    generateProposal: generateProposalFn,
  };
}

// ---------------------------------------------------------------------------
// useMealPlanMonth
// ---------------------------------------------------------------------------

export interface DayPlanIndicator {
  date: string;
  hasPlan: boolean;
  mealCount: number;
}

interface UseMealPlanMonthReturn {
  days: DayPlanIndicator[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching monthly plan indicators.
 *
 * Checks each week of the given month for existing plans.
 *
 * @param familyId - The family ID to fetch plans for.
 * @param year - The year (e.g. 2024).
 * @param month - The month (0-indexed, 0 = January).
 * @param initialDays - Optional server-fetched day indicators to use as initial state
 *   instead of fetching on mount. When provided, the initial fetch is skipped.
 */
export function useMealPlanMonth(
  familyId: string | null,
  year: number,
  month: number, // 0-indexed
  initialDays?: DayPlanIndicator[],
): UseMealPlanMonthReturn {
  const [days, setDays] = useState<DayPlanIndicator[]>(initialDays ?? []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!familyId) return;
    setLoading(true);
    setError(null);
    try {
      // Calculate the first and last day of the month
      const firstDay = new Date(Date.UTC(year, month, 1));
      const lastDay = new Date(Date.UTC(year, month + 1, 0));

      // Generate all dates in the month
      const allDays: DayPlanIndicator[] = [];
      const current = new Date(firstDay);
      while (current <= lastDay) {
        const dateStr = current.toISOString().slice(0, 10);
        allDays.push({ date: dateStr, hasPlan: false, mealCount: 0 });
        current.setUTCDate(current.getUTCDate() + 1);
      }

      // Check each week for a plan
      // Find all Mondays in the month range
      const mondays: string[] = [];
      const scanDate = new Date(firstDay);
      // Go back to the Monday of the first week
      const dayOfWeek = scanDate.getUTCDay();
      const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      scanDate.setUTCDate(scanDate.getUTCDate() + offset);

      while (scanDate <= lastDay) {
        const mondayStr = scanDate.toISOString().slice(0, 10);
        mondays.push(mondayStr);
        scanDate.setUTCDate(scanDate.getUTCDate() + 7);
      }

      // Fetch each week's plan
      for (const monday of mondays) {
        const result = await getWeeklyPlan(familyId, monday);
        if (result.mealPlan && result.mealPlan.entries) {
          for (const entry of result.mealPlan.entries) {
            const dayIdx = allDays.findIndex((d) => d.date === entry.date);
            if (dayIdx >= 0) {
              allDays[dayIdx].hasPlan = true;
              allDays[dayIdx].mealCount += 1;
            }
          }
        }
      }

      setDays(allDays);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  }, [familyId, year, month]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { days, loading, error, refresh };
}
