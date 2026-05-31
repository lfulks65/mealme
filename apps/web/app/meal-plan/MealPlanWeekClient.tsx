/**
 * @module MealPlanWeekClient
 * Client component wrapper for the weekly meal plan view.
 *
 * Receives server-fetched data as props and passes it to the
 * interactive MealPlanWeekScreen component. Resolves the
 * family ID from the FamilyProvider context.
 */

'use client';

import { useFamily } from '@mealme/api';
import type { MealPlanWithEntries } from '@mealme/api';
import { MealPlanWeekScreen } from '@/components/meal-plan/MealPlanWeekScreen';

interface MealPlanWeekClientProps {
  initialWeekStart: string;
  initialMealPlan: MealPlanWithEntries | null;
}

export function MealPlanWeekClient({
  initialWeekStart,
  initialMealPlan,
}: MealPlanWeekClientProps) {
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
