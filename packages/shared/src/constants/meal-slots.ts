/**
 * @module meal-slots
 * Meal slot constants for MealMe.
 *
 * Meal slots represent the times of day that a family plans meals
 * for. They are used in MealPlan entries and FamilyPreferences.
 */

/**
 * All supported meal slots.
 *
 * Each entry has a machine-readable `key`, a human-readable `label`,
 * and a `defaultTime` (approximate) for display purposes.
 */
export const MEAL_SLOTS = {
  breakfast: { key: 'breakfast', label: 'Breakfast', defaultTime: '08:00' },
  morningSnack: { key: 'morning-snack', label: 'Morning Snack', defaultTime: '10:00' },
  lunch: { key: 'lunch', label: 'Lunch', defaultTime: '12:00' },
  afternoonSnack: { key: 'afternoon-snack', label: 'Afternoon Snack', defaultTime: '15:00' },
  dinner: { key: 'dinner', label: 'Dinner', defaultTime: '18:00' },
  eveningSnack: { key: 'evening-snack', label: 'Evening Snack', defaultTime: '20:00' },
} as const;

/** Type representing a meal slot key. */
export type MealSlot =
  keyof typeof MEAL_SLOTS;

/** Array of all meal slot keys for iteration. */
export const MEAL_SLOT_KEYS: MealSlot[] =
  Object.keys(MEAL_SLOTS) as MealSlot[];

/** Human-readable label for a meal slot key. */
export function getMealSlotLabel(
  key: MealSlot,
): string {
  return MEAL_SLOTS[key].label;
}

/** Default time string for a meal slot key. */
export function getMealSlotDefaultTime(
  key: MealSlot,
): string {
  return MEAL_SLOTS[key].defaultTime;
}
