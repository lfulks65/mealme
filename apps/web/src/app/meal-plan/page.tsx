/**
 * @module /meal-plan
 * Meal plan page — weekly view with monthly navigation.
 *
 * This is the main meal planning page that shows the weekly grid
 * and provides navigation to the monthly overview.
 */

'use client';

import React, { useState, useCallback } from 'react';
import { getWeekStart, getToday } from '@mealme/shared';
import { MealPlanWeekScreen } from '../../components/meal-plan/MealPlanWeekScreen';
import { MealPlanMonthScreen } from '../../components/meal-plan/MealPlanMonthScreen';

type ViewMode = 'week' | 'month';

export default function MealPlanPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [familyId] = useState<string | null>('demo-family'); // In production, from auth context
  const [weekStart, setWeekStart] = useState(() => getWeekStart(getToday()));

  const handleDaySelect = useCallback((date: string) => {
    setWeekStart(getWeekStart(date));
    setViewMode('week');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* View mode toggle */}
      <div className="flex items-center justify-center gap-2 py-2 bg-white border-b">
        <button
          onClick={() => setViewMode('week')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'week'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
          }`}
        >
          📅 Week View
        </button>
        <button
          onClick={() => setViewMode('month')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'month'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
          }`}
        >
          🗓️ Month View
        </button>
      </div>

      {/* Content */}
      {viewMode === 'week' ? (
        <MealPlanWeekScreen familyId={familyId} initialWeekStart={weekStart} />
      ) : (
        <MealPlanMonthScreen familyId={familyId} onDaySelect={handleDaySelect} />
      )}
    </div>
  );
}
