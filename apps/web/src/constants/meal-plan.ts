/**
 * @module meal-plan-constants
 * UI-specific constants for the meal plan screens.
 */

import type { MealSlot } from '@mealme/shared';
import { MEAL_SLOTS } from '@mealme/shared';

/** The 4 primary meal slots displayed in the weekly grid. */
export const PRIMARY_MEAL_SLOTS: MealSlot[] = [
  'breakfast',
  'lunch',
  'dinner',
  'afternoonSnack', // mapped to "Snack" in the UI
];

/** Display labels for the 4 primary meal slots. */
export const MEAL_SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  morningSnack: 'AM Snack',
  lunch: 'Lunch',
  afternoonSnack: 'Snack',
  dinner: 'Dinner',
  eveningSnack: 'PM Snack',
};

/** Short labels for the weekly grid header. */
export const MEAL_SLOT_SHORT_LABELS: Record<MealSlot, string> = {
  breakfast: 'B',
  morningSnack: 'MS',
  lunch: 'L',
  afternoonSnack: 'S',
  dinner: 'D',
  eveningSnack: 'ES',
};

/** Day-of-week labels for the weekly grid. */
export const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Color classes for each meal slot. */
export const MEAL_SLOT_COLORS: Record<MealSlot, { bg: string; border: string; text: string }> = {
  breakfast: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  morningSnack: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  lunch: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800' },
  afternoonSnack: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  dinner: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  eveningSnack: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800' },
};

/** Get the display label for a meal slot in the grid context. */
export function getGridSlotLabel(slot: MealSlot): string {
  if (slot === 'afternoonSnack') return 'Snack';
  return MEAL_SLOTS[slot]?.label ?? slot;
}
