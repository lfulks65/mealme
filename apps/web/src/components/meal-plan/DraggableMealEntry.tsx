/**
 * @module DraggableMealEntry
 * A draggable meal entry card for the weekly grid.
 *
 * Uses HTML5 Drag and Drop API on web. Wraps a MealEntryCard
 * and makes it draggable for reassignment between slots.
 */

'use client';

import React, { useCallback } from 'react';
import type { MealPlanEntryWithRecipe } from '@mealme/api';

interface DraggableMealEntryProps {
  entry: MealPlanEntryWithRecipe;
  onClick: () => void;
}

export function DraggableMealEntry({ entry, onClick }: DraggableMealEntryProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData('text/meal-entry-id', entry.id);
      e.dataTransfer.effectAllowed = 'move';
      // Add a slight opacity to the drag image
      const target = e.currentTarget as HTMLElement;
      target.style.opacity = '0.5';
    },
    [entry.id],
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = '1';
  }, []);

  const recipe = entry.recipe;
  const title = recipe?.title ?? 'Unknown Recipe';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={onClick}
      className="w-full min-h-[60px] p-2 bg-white border border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow text-left"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick();
      }}
    >
      <div className="text-sm font-medium text-gray-900 truncate">{title}</div>
      {recipe && (
        <div className="text-xs text-gray-500 mt-0.5">
          {recipe.prep_time_minutes + recipe.cook_time_minutes} min · {recipe.servings} srv
        </div>
      )}
    </div>
  );
}
