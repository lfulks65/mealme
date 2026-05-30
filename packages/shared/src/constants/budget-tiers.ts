/**
 * @module budget-tiers
 * Budget tier constants for MealMe.
 *
 * Budget tiers control the grocery spending level for a family.
 * They influence recipe suggestions and shopping list optimization.
 */

/**
 * All supported budget tiers.
 *
 * Each entry has a machine-readable `key`, a human-readable `label`,
 * and a `weeklyRangeUsd` indicating the typical weekly spend.
 */
export const BUDGET_TIERS = {
  frugal: { key: 'frugal', label: 'Frugal', weeklyRangeUsd: [40, 60] as const },
  moderate: { key: 'moderate', label: 'Moderate', weeklyRangeUsd: [60, 100] as const },
  comfortable: { key: 'comfortable', label: 'Comfortable', weeklyRangeUsd: [100, 150] as const },
  premium: { key: 'premium', label: 'Premium', weeklyRangeUsd: [150, 250] as const },
  custom: { key: 'custom', label: 'Custom', weeklyRangeUsd: null },
} as const;

/** Type representing a budget tier key. */
export type BudgetTier =
  keyof typeof BUDGET_TIERS;

/** Array of all budget tier keys for iteration. */
export const BUDGET_TIER_KEYS: BudgetTier[] =
  Object.keys(BUDGET_TIERS) as BudgetTier[];

/** Human-readable label for a budget tier key. */
export function getBudgetTierLabel(
  key: BudgetTier,
): string {
  return BUDGET_TIERS[key].label;
}

/** Weekly spending range for a budget tier (null for custom). */
export function getBudgetTierWeeklyRange(
  key: BudgetTier,
): readonly [number, number] | null {
  return BUDGET_TIERS[key].weeklyRangeUsd;
}
