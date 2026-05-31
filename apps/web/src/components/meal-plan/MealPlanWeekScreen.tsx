/**
 * @module MealPlanWeekScreen
 * Weekly meal plan view showing 7 days × 4 meal slots in a grid.
 *
 * Features:
 *   - 7-day × 4-slot grid (Breakfast, Lunch, Dinner, Snack)
 *   - Each cell shows recipe name or empty slot placeholder
 *   - Tap empty slot → open MealSlotPicker
 *   - Tap filled slot → view/edit/remove options
 *   - "Generate Plan" button at top
 *   - Drag-and-drop to reassign meals between slots
 *   - Navigate between weeks
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { MealSlot } from '@mealme/shared';
import { getWeekStart, addDays, getDateRange, getToday } from '@mealme/shared';
import type { MealPlanEntryWithRecipe, MealPlanWithEntries } from '@mealme/api';
import { useWeeklyMealPlan } from '../../hooks/useMealPlan';
import {
  PRIMARY_MEAL_SLOTS,
  DAY_LABELS,
  MEAL_SLOT_COLORS,
  getGridSlotLabel,
} from '../../constants/meal-plan';
import { MealSlotPicker } from './MealSlotPicker';
import { MealEntryCard } from './MealEntryCard';
import { DraggableMealEntry } from './DraggableMealEntry';
import { DroppableSlot } from './DroppableSlot';
import { PlanProposalScreen } from './PlanProposalScreen';

interface MealPlanWeekScreenProps {
  familyId: string | null;
  initialWeekStart?: string;
  /** Server-fetched meal plan data. When provided, the hook skips its initial fetch. */
  initialMealPlan?: MealPlanWithEntries | null;
}

export function MealPlanWeekScreen({ familyId, initialWeekStart, initialMealPlan }: MealPlanWeekScreenProps) {
  const [weekStart, setWeekStart] = useState(
    initialWeekStart ?? getWeekStart(getToday()),
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<{ date: string; mealSlot: MealSlot } | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<MealPlanEntryWithRecipe | null>(null);
  const [proposalPlan, setProposalPlan] = useState<MealPlanWithEntries | null>(null);
  const [generating, setGenerating] = useState(false);

  const { mealPlan, loading, error, assignRecipe, removeEntry, moveEntry, generateProposal } =
    useWeeklyMealPlan(familyId, weekStart, initialMealPlan);

  // Compute the 7 dates for the current week
  const weekDates = useMemo(
    () => getDateRange(weekStart, addDays(weekStart, 6)),
    [weekStart],
  );

  // Build a lookup map: `${date}_${mealSlot}` → entry
  const entryMap = useMemo(() => {
    const map = new Map<string, MealPlanEntryWithRecipe>();
    if (mealPlan?.entries) {
      for (const entry of mealPlan.entries) {
        map.set(`${entry.date}_${entry.meal_slot}`, entry);
      }
    }
    return map;
  }, [mealPlan]);

  // Navigation
  const goToPrevWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, -7));
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekStart((prev) => addDays(prev, 7));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    setWeekStart(getWeekStart(getToday()));
  }, []);

  // Slot interactions
  const handleEmptySlotTap = useCallback((date: string, mealSlot: MealSlot) => {
    setPickerSlot({ date, mealSlot });
    setPickerOpen(true);
  }, []);

  const handleFilledSlotTap = useCallback((entry: MealPlanEntryWithRecipe) => {
    setSelectedEntry(entry);
  }, []);

  const handleRecipeSelect = useCallback(
    async (recipeId: string) => {
      if (!pickerSlot) return;
      await assignRecipe(pickerSlot.date, pickerSlot.mealSlot, recipeId);
      setPickerOpen(false);
      setPickerSlot(null);
    },
    [pickerSlot, assignRecipe],
  );

  const handleRemoveEntry = useCallback(
    async (entryId: string) => {
      await removeEntry(entryId);
      setSelectedEntry(null);
    },
    [removeEntry],
  );

  const handleSwapEntry = useCallback(
    (entry: MealPlanEntryWithRecipe) => {
      setPickerSlot({ date: entry.date, mealSlot: entry.meal_slot });
      setPickerOpen(true);
      setSelectedEntry(null);
    },
    [],
  );

  // Drag-and-drop handler
  const handleDrop = useCallback(
    async (entryId: string, targetDate: string, targetMealSlot: MealSlot) => {
      await moveEntry(entryId, targetDate, targetMealSlot);
    },
    [moveEntry],
  );

  // Generate plan
  const handleGeneratePlan = useCallback(async () => {
    if (!familyId) return;
    setGenerating(true);
    try {
      const result = await generateProposal(familyId, weekStart);
      if (result.mealPlan && result.mealPlan.status === 'draft') {
        setProposalPlan(result.mealPlan);
      }
    } finally {
      setGenerating(false);
    }
  }, [familyId, weekStart, generateProposal]);

  // Proposal handlers
  const handleAcceptAll = useCallback(() => {
    // Close the proposal screen — the draft plan is already saved
    setProposalPlan(null);
  }, []);

  const handleRegenerate = useCallback(async () => {
    if (!familyId) return;
    setGenerating(true);
    try {
      const result = await generateProposal(familyId, weekStart);
      if (result.mealPlan) {
        setProposalPlan(result.mealPlan);
      }
    } finally {
      setGenerating(false);
    }
  }, [familyId, weekStart, generateProposal]);

  const handleAcceptSlot = useCallback(
    async (_entryId: string) => {
      // Mark as accepted — no API call needed, entry is already in the plan
    },
    [],
  );

  const handleRejectSlot = useCallback(
    async (entryId: string) => {
      await removeEntry(entryId);
    },
    [removeEntry],
  );

  const handleSwapSlot = useCallback(
    async (entryId: string, recipeId: string) => {
      // Update the entry with the new recipe
      const { updateMealEntry } = await import('@mealme/api');
      await updateMealEntry(entryId, { recipeId });
    },
    [],
  );

  // Format week range for header
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = `${weekStart} — ${weekEnd}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevWeek}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Next →
          </button>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{weekLabel}</h2>
        <button
          onClick={handleGeneratePlan}
          disabled={loading || !familyId}
          className="px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ✨ Generate Plan
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border-b border-blue-200">
          Loading meal plan…
        </div>
      )}

      {/* Weekly Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-[800px]">
          {/* Column headers: Day names + dates */}
          <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1">
            <div className="text-xs font-medium text-gray-400 p-2" />
            {weekDates.map((date, i) => {
              const isToday = date === getToday();
              return (
                <div
                  key={date}
                  className={`text-center p-2 rounded-t-lg text-xs font-semibold ${
                    isToday
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-sm">{date.slice(8)}</div>
                </div>
              );
            })}
          </div>

          {/* Meal slot rows */}
          {PRIMARY_MEAL_SLOTS.map((slot) => {
            const colors = MEAL_SLOT_COLORS[slot];
            return (
              <div
                key={slot}
                className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1"
              >
                {/* Row label */}
                <div
                  className={`flex items-center justify-center p-2 rounded-l-lg text-sm font-medium ${colors.bg} ${colors.text} ${colors.border} border`}
                >
                  {getGridSlotLabel(slot)}
                </div>

                {/* Cells for each day */}
                {weekDates.map((date) => {
                  const key = `${date}_${slot}`;
                  const entry = entryMap.get(key);

                  return (
                    <DroppableSlot
                      key={key}
                      date={date}
                      mealSlot={slot}
                      onDrop={handleDrop}
                    >
                      {entry && entry.recipe ? (
                        <DraggableMealEntry
                          entry={entry}
                          onClick={() => handleFilledSlotTap(entry)}
                        />
                      ) : (
                        <button
                          onClick={() => handleEmptySlotTap(date, slot)}
                          className={`w-full h-full min-h-[60px] flex items-center justify-center border-2 border-dashed rounded-lg ${colors.border} ${colors.text} opacity-40 hover:opacity-80 transition-opacity text-xs`}
                        >
                          + Add
                        </button>
                      )}
                    </DroppableSlot>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slot Picker Modal */}
      {pickerOpen && pickerSlot && (
        <MealSlotPicker
          date={pickerSlot.date}
          mealSlot={pickerSlot.mealSlot}
          onSelect={handleRecipeSelect}
          onClose={() => {
            setPickerOpen(false);
            setPickerSlot(null);
          }}
        />
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <MealEntryCard
          entry={selectedEntry}
          onRemove={() => handleRemoveEntry(selectedEntry.id)}
          onSwap={() => handleSwapEntry(selectedEntry)}
          onClose={() => setSelectedEntry(null)}
        />
      )}

      {/* AI Proposal Screen */}
      {proposalPlan && (
        <PlanProposalScreen
          mealPlan={proposalPlan}
          onAcceptAll={handleAcceptAll}
          onRegenerate={handleRegenerate}
          onAcceptSlot={handleAcceptSlot}
          onRejectSlot={handleRejectSlot}
          onSwapSlot={handleSwapSlot}
          onClose={() => setProposalPlan(null)}
          loading={generating}
        />
      )}
    </div>
  );
}
