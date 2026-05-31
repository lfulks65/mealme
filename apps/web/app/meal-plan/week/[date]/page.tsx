/**
 * @module MealPlanWeekPage
 * SSG page for a specific week's meal plan view.
 *
 * Uses generateStaticParams to pre-render the next 4 weeks.
 * Fetches meal plan data server-side and passes it to the
 * client component for interactive rendering.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getWeeklyMealPlan } from '@/lib/meal-plan';
import { addDays, getWeekStart, getToday } from '@mealme/shared';
import { MealPlanWeekClient } from './MealPlanWeekClient';

interface MealPlanWeekPageProps {
  params: { date: string };
}

/**
 * Generate static params for the next 4 weeks.
 * This enables SSG for the most commonly accessed weeks.
 */
export function generateStaticParams() {
  const today = getToday();
  const currentMonday = getWeekStart(today);

  return Array.from({ length: 4 }, (_, i) => ({
    date: addDays(currentMonday, i * 7),
  }));
}

/**
 * Generate metadata for a specific week's meal plan page.
 */
export async function generateMetadata({
  params,
}: MealPlanWeekPageProps): Promise<Metadata> {
  const { date } = params;
  const weekEnd = addDays(date, 6);

  return {
    title: `Meal Plan: ${date} — ${weekEnd} — MealMe`,
    description: `View and manage your meal plan for the week of ${date} to ${weekEnd}. Assign recipes, generate AI proposals, and organize your family meals.`,
  };
}

export default async function MealPlanWeekPage({ params }: MealPlanWeekPageProps) {
  const { date } = params;

  // Validate the date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  // Fetch meal plan data server-side
  // Note: familyId is resolved client-side from context
  const result = await getWeeklyMealPlan('', date);
  const initialMealPlan = result.mealPlan;

  return (
    <MealPlanWeekClient
      initialWeekStart={date}
      initialMealPlan={initialMealPlan}
    />
  );
}
