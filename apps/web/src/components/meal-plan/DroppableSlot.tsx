/**
 * @module DroppableSlot
 * A droppable zone for drag-and-drop meal reassignment.
 *
 * Uses HTML5 Drag and Drop API on web. Wraps a grid cell
 * and handles dragover/drop events to move meals between slots.
 */

'use client';

import React, { useCallback, useState } from 'react';
import type { MealSlot } from '@mealme/shared';

interface DroppableSlotProps {
  date: string;
  mealSlot: MealSlot;
  onDrop: (entryId: string, targetDate: string, targetMealSlot: MealSlot) => void;
  children: React.ReactNode;
}

export function DroppableSlot({ date, mealSlot, onDrop, children }: DroppableSlotProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsOver(false);
      const entryId = e.dataTransfer.getData('text/meal-entry-id');
      if (entryId) {
        onDrop(entryId, date, mealSlot);
      }
    },
    [date, mealSlot, onDrop],
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-[60px] rounded-lg transition-colors ${
        isOver
          ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset'
          : ''
      }`}
    >
      {children}
    </div>
  );
}
