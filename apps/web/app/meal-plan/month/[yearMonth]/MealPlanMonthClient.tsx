/**
 * @module MealPlanMonthClient
 * Client component wrapper for the monthly meal plan calendar view.
 *
 * Receives server-fetched day indicators as props and passes them
 * to the interactive MealPlanMonthScreen component.
 */

'use client';

import { useFamily } from '@mealme/api';
import { MealPlanMonthScreen } from '@/components/meal-plan/MealPlanMonthScreen';
import type { DayPlanIndicator } from '@/hooks/useMealPlan';
import { useRouter } from 'next/navigation';

interface MealPlanMonthClientProps {
  year: number;
  month: number;
  initialDays: DayPlanIndicator[];
}

export function MealPlanMonthClient({
  year: _year,
  month: _month,
  initialDays,
}: MealPlanMonthClientProps) {
  const { currentFamily } = useFamily();
  const familyId = currentFamily?.id ?? null;
  const router = useRouter();

  const handleDaySelect = (date: string) => {
    router.push(`/meal-plan/week/${date}`);
  };

  return (
    <MealPlanMonthScreen
      familyId={familyId}
      onDaySelect={handleDaySelect}
      initialDays={initialDays}
    />
  );
}
