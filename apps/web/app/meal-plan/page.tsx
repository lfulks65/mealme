/**
 * @module MealPlanPage
 * Server Component for the current week's meal plan view.
 *
 * Fetches the current week's meal plan data server-side and passes
 * it to the client component for interactive rendering.
 */

import { Metadata } from 'next';
import { getWeeklyMealPlan, getAuthenticatedUserId } from '@/lib/meal-plan';
import { getWeekStart, getToday } from '@mealme/shared';
import { MealPlanWeekClient } from './MealPlanWeekClient';

export const metadata: Metadata = {
  title: 'Meal Plan — MealMe',
  description: 'View and manage your weekly meal plan. Assign recipes, generate AI proposals, and organize your family meals.',
};

export default async function MealPlanPage() {
  const userId = await getAuthenticatedUserId();
  const weekStart = getWeekStart(getToday());

  // Fetch current week's meal plan server-side
  // Note: familyId will be resolved client-side from the FamilyProvider context
  // Server-side fetch provides initial data for SEO and faster paint
  let initialMealPlan = null;
  if (userId) {
    const result = await getWeeklyMealPlan('', weekStart);
    if (result.mealPlan) {
      initialMealPlan = result.mealPlan;
    }
  }

  return (
    <MealPlanWeekClient
      initialWeekStart={weekStart}
      initialMealPlan={initialMealPlan}
    />
  );
}
