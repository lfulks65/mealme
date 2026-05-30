/**
 * @module PlanProposalScreen
 * Shows AI-generated draft meal plan with accept/reject per slot.
 *
 * Features:
 *   - Displays the AI-proposed meal plan in a weekly grid
 *   - Each slot can be individually accepted, rejected, or swapped
 *   - "Accept All" and "Regenerate" buttons
 *   - Swap opens the MealSlotPicker for that slot
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { addDays, getDateRange, getToday } from '@mealme/shared';
import type { MealPlanWithEntries, MealPlanEntryWithRecipe } from '@mealme/api';
import {
  PRIMARY_MEAL_SLOTS,
  DAY_LABELS,
  MEAL_SLOT_COLORS,
  getGridSlotLabel,
} from '../../constants/meal-plan';
import { MealSlotPicker } from './MealSlotPicker';

interface PlanProposalScreenProps {
  mealPlan: MealPlanWithEntries;
  onAcceptAll: () => void;
  onRegenerate: () => void;
  onAcceptSlot: (entryId: string) => void;
  onRejectSlot: (entryId: string) => void;
  onSwapSlot: (entryId: string, recipeId: string) => void;
  onClose: () => void;
  loading?: boolean;
}

type SlotStatus = 'pending' | 'accepted' | 'rejected';

export function PlanProposalScreen({
  mealPlan,
  onAcceptAll,
  onRegenerate,
  onAcceptSlot,
  onRejectSlot,
  onSwapSlot,
  onClose,
  loading = false,
}: PlanProposalScreenProps) {
  // Track per-slot status
  const [slotStatuses, setSlotStatuses] = useState<Record<string, SlotStatus>>(() => {
    const statuses: Record<string, SlotStatus> = {};
    if (mealPlan.entries) {
      for (const entry of mealPlan.entries) {
        statuses[entry.id] = 'pending';
      }
    }
    return statuses;
  });

  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapEntryId, setSwapEntryId] = useState<string | null>(null);

  // Compute the 7 dates for the plan week
  const weekDates = useMemo(
    () => getDateRange(mealPlan.week_start_date, addDays(mealPlan.week_start_date, 6)),
    [mealPlan.week_start_date],
  );

  // Build a lookup map: `${date}_${mealSlot}` → entry
  const entryMap = useMemo(() => {
    const map = new Map<string, MealPlanEntryWithRecipe>();
    if (mealPlan.entries) {
      for (const entry of mealPlan.entries) {
        map.set(`${entry.date}_${entry.meal_slot}`, entry);
      }
    }
    return map;
  }, [mealPlan]);

  // Count statuses
  const statusCounts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    for (const status of Object.values(slotStatuses)) {
      if (status === 'pending') pending++;
      else if (status === 'accepted') accepted++;
      else rejected++;
    }
    return { pending, accepted, rejected };
  }, [slotStatuses]);

  const handleAcceptSlot = useCallback(
    (entryId: string) => {
      setSlotStatuses((prev) => ({ ...prev, [entryId]: 'accepted' }));
      onAcceptSlot(entryId);
    },
    [onAcceptSlot],
  );

  const handleRejectSlot = useCallback(
    (entryId: string) => {
      setSlotStatuses((prev) => ({ ...prev, [entryId]: 'rejected' }));
      onRejectSlot(entryId);
    },
    [onRejectSlot],
  );

  const handleSwapClick = useCallback((entryId: string) => {
    setSwapEntryId(entryId);
    setPickerOpen(true);
  }, []);

  const handleRecipeSelect = useCallback(
    (recipeId: string) => {
      if (swapEntryId) {
        onSwapSlot(swapEntryId, recipeId);
        setSlotStatuses((prev) => ({ ...prev, [swapEntryId]: 'accepted' }));
      }
      setPickerOpen(false);
      setSwapEntryId(null);
    },
    [swapEntryId, onSwapSlot],
  );

  // Get the date and mealSlot for the swap entry
  const swapEntry = useMemo(() => {
    if (!swapEntryId) return null;
    return mealPlan.entries?.find((e) => e.id === swapEntryId) ?? null;
  }, [swapEntryId, mealPlan.entries]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div>
          <h2 className="text-lg font-semibold">✨ AI Meal Plan Proposal</h2>
          <p className="text-sm text-purple-200">
            Review and accept, reject, or swap each meal
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-purple-200 hover:text-white rounded-md hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50 text-sm">
        <div className="flex items-center gap-3">
          <span className="text-gray-500">
            <span className="font-medium text-yellow-600">{statusCounts.pending}</span> pending
          </span>
          <span className="text-gray-500">
            <span className="font-medium text-emerald-600">{statusCounts.accepted}</span> accepted
          </span>
          <span className="text-gray-500">
            <span className="font-medium text-red-600">{statusCounts.rejected}</span> rejected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="px-3 py-1.5 text-sm font-medium text-purple-700 bg-purple-50 rounded-md hover:bg-purple-100 disabled:opacity-50 transition-colors"
          >
            🔄 Regenerate
          </button>
          <button
            onClick={onAcceptAll}
            disabled={loading || statusCounts.pending === 0}
            className="px-3 py-1.5 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            ✅ Accept All
          </button>
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border-b border-blue-200">
          Generating proposal…
        </div>
      )}

      {/* Proposal Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="min-w-[800px]">
          {/* Column headers */}
          <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-1 mb-1">
            <div className="text-xs font-medium text-gray-400 p-2" />
            {weekDates.map((date, i) => {
              const isToday = date === getToday();
              return (
                <div
                  key={date}
                  className={`text-center p-2 rounded-t-lg text-xs font-semibold ${
                    isToday ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
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

                {/* Cells */}
                {weekDates.map((date) => {
                  const key = `${date}_${slot}`;
                  const entry = entryMap.get(key);

                  if (!entry || !entry.recipe) {
                    return (
                      <div
                        key={key}
                        className="min-h-[60px] flex items-center justify-center border-2 border-dashed rounded-lg border-gray-200 text-gray-300 text-xs"
                      >
                        —
                      </div>
                    );
                  }

                  const status = slotStatuses[entry.id] ?? 'pending';
                  const statusBorder =
                    status === 'accepted'
                      ? 'border-emerald-400 bg-emerald-50'
                      : status === 'rejected'
                      ? 'border-red-300 bg-red-50'
                      : 'border-yellow-300 bg-yellow-50';

                  return (
                    <div
                      key={key}
                      className={`min-h-[60px] p-2 border-2 rounded-lg ${statusBorder}`}
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {entry.recipe.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {entry.recipe.prep_time_minutes + entry.recipe.cook_time_minutes} min
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 mt-1">
                        {status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleAcceptSlot(entry.id)}
                              className="px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-100 rounded hover:bg-emerald-200 transition-colors"
                              title="Accept"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleRejectSlot(entry.id)}
                              className="px-1.5 py-0.5 text-[10px] font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors"
                              title="Reject"
                            >
                              ✗
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleSwapClick(entry.id)}
                          className="px-1.5 py-0.5 text-[10px] font-medium text-blue-700 bg-blue-100 rounded hover:bg-blue-200 transition-colors"
                          title="Swap recipe"
                        >
                          🔄
                        </button>
                        {status === 'accepted' && (
                          <span className="text-[10px] text-emerald-600 font-medium">✓ Accepted</span>
                        )}
                        {status === 'rejected' && (
                          <span className="text-[10px] text-red-600 font-medium">✗ Rejected</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Slot Picker Modal */}
      {pickerOpen && swapEntry && (
        <MealSlotPicker
          date={swapEntry.date}
          mealSlot={swapEntry.meal_slot}
          onSelect={handleRecipeSelect}
          onClose={() => {
            setPickerOpen(false);
            setSwapEntryId(null);
          }}
        />
      )}
    </div>
  );
}
