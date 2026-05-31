/**
 * @module MealPlanEntryClient
 * Client component for displaying a meal plan entry detail.
 *
 * Receives server-fetched entry data as props and renders
 * the entry card with interactive options.
 */

'use client';

import { useState } from 'react';
import type { MealPlanEntryWithRecipe } from '@mealme/api';
import { MealEntryCard } from '@/components/meal-plan/MealEntryCard';
import { useRouter } from 'next/navigation';

interface MealPlanEntryClientProps {
  entry: MealPlanEntryWithRecipe;
}

export function MealPlanEntryClient({ entry }: MealPlanEntryClientProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <MealEntryCard
      entry={entry}
      onRemove={() => {
        // TODO: Call removeMealEntry API, then navigate back
        setVisible(false);
        router.back();
      }}
      onSwap={() => {
        // TODO: Open recipe picker for swap
      }}
      onClose={() => {
        router.back();
      }}
    />
  );
}
