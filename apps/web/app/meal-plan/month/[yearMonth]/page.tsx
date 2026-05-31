/**
 * @module MealPlanMonthPage
 * SSG page for a monthly meal plan calendar view.
 *
 * Uses generateStaticParams to pre-render the current and next month.
 * Fetches monthly plan indicators server-side and passes them to
 * the client component for interactive rendering.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMonthlyMealPlan } from '@/lib/meal-plan';
import { MealPlanMonthClient } from './MealPlanMonthClient';

interface MealPlanMonthPageProps {
  params: { yearMonth: string };
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Generate static params for the current and next month.
 * Format: YYYY-MM (e.g. "2024-01")
 */
export function generateStaticParams() {
  const now = new Date();
  const params: { yearMonth: string }[] = [];

  for (let offset = 0; offset <= 1; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    params.push({ yearMonth: `${year}-${month}` });
  }

  return params;
}

/**
 * Generate metadata for a specific month's meal plan page.
 */
export async function generateMetadata({
  params,
}: MealPlanMonthPageProps): Promise<Metadata> {
  const { yearMonth } = params;
  const [yearStr, monthStr] = yearMonth.split('-');
  const monthIndex = parseInt(monthStr, 10) - 1;
  const monthName = MONTH_NAMES[monthIndex] ?? yearMonth;

  return {
    title: `Meal Plan: ${monthName} ${yearStr} — MealMe`,
    description: `View your meal plan calendar for ${monthName} ${yearStr}. See which days have meals planned and navigate to weekly views.`,
  };
}

export default async function MealPlanMonthPage({ params }: MealPlanMonthPageProps) {
  const { yearMonth } = params;

  // Validate the yearMonth format (YYYY-MM)
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
    notFound();
  }

  const [yearStr, monthStr] = yearMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed

  // Validate month range
  if (month < 0 || month > 11) {
    notFound();
  }

  // Fetch monthly plan indicators server-side
  // Note: familyId is resolved client-side from context
  const result = await getMonthlyMealPlan('', year, month);
  const initialDays = result.days;

  return (
    <MealPlanMonthClient
      year={year}
      month={month}
      initialDays={initialDays}
    />
  );
}
