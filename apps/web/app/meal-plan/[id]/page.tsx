/**
 * @module MealPlanEntryPage
 * SSR page for an individual meal plan entry detail.
 *
 * Fetches the meal plan entry server-side and renders a detail view.
 * Uses generateMetadata for SEO-friendly page titles.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMealPlanEntry } from '@/lib/meal-plan';
import { MealPlanEntryClient } from './MealPlanEntryClient';

interface MealPlanEntryPageProps {
  params: { id: string };
}

/**
 * Generate metadata for a specific meal plan entry.
 */
export async function generateMetadata({
  params,
}: MealPlanEntryPageProps): Promise<Metadata> {
  const { id } = params;
  const result = await getMealPlanEntry(id);

  if (result.error || !result.entry) {
    return {
      title: 'Meal Plan Entry — MealMe',
      description: 'View meal plan entry details.',
    };
  }

  const entry = result.entry;
  const recipeTitle = entry.recipe?.title ?? 'Unassigned';
  const slotLabel = entry.meal_slot;

  return {
    title: `${recipeTitle} — ${slotLabel} ${entry.date} — MealMe`,
    description: `Meal plan entry: ${recipeTitle} for ${slotLabel} on ${entry.date}.`,
  };
}

export default async function MealPlanEntryPage({ params }: MealPlanEntryPageProps) {
  const { id } = params;
  const result = await getMealPlanEntry(id);

  if (result.error || !result.entry) {
    notFound();
  }

  return <MealPlanEntryClient entry={result.entry} />;
}
