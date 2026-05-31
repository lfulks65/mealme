/**
 * @module MealPlanWeekDateClient
 * Client component wrapper for a specific week's meal plan view.
 *
 * Receives server-fetched data as props and passes it to the
 * interactive MealPlanWeekScreen component.
 */

'use client';

import { useFamily } from '@mealme/api';
import type { MealPlanWithEntries } from '@mealme/api';
import { MealPlanWeekScreen } from '@/components/meal-plan/MealPlanWeekScreen';

interface MealPlanWeekDateClientProps {
  initialWeekStart: string;
  initialMealPlan: MealPlanWithEntries | null;
}

export function MealPlanWeekClient({
  initialWeekStart,
  initialMealPlan,
}: MealPlanWeekDateClientProps) {
  const { currentFamily } = useFamily();
  const familyId = currentFamily?.id ?? null;

  return (
    <MealPlanWeekScreen
      familyId={familyId}
      initialWeekStart={initialWeekStart}
      initialMealPlan={initialMealPlan}
    />
  );
}
