/**
 * @module MealPlanMonthScreen
 * Monthly calendar overview with dots/badges indicating days with plans.
 *
 * Features:
 *   - Full month calendar grid
 *   - Dots/badges showing days that have meal plans
 *   - Navigate between months
 *   - Click a day to navigate to the weekly view
 *   - Shows meal count per day as a badge
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { getToday } from '@mealme/shared';
import { useMealPlanMonth } from '../../hooks/useMealPlan';
import type { DayPlanIndicator } from '../../hooks/useMealPlan';

interface MealPlanMonthScreenProps {
  familyId: string | null;
  onDaySelect?: (date: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADER_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function MealPlanMonthScreen({ familyId, onDaySelect }: MealPlanMonthScreenProps) {
  const today = getToday();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth()); // 0-indexed

  const { days, loading, error } = useMealPlanMonth(familyId, year, month);

  // Build a lookup map: date → DayPlanIndicator
  const dayMap = useMemo(() => {
    const map = new Map<string, DayPlanIndicator>();
    for (const d of days) {
      map.set(d.date, d);
    }
    return map;
  }, [days]);

  // Build the calendar grid
  const calendarWeeks = useMemo(() => {
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));

    // Day of week for the 1st (0=Sun, 6=Sat)
    const startDow = firstDay.getUTCDay();
    // Total days in the month
    const totalDays = lastDay.getUTCDate();

    // Build array of weeks, each week is 7 cells
    const weeks: (string | null)[][] = [];
    let currentWeek: (string | null)[] = [];

    // Fill leading empty cells
    for (let i = 0; i < startDow; i++) {
      currentWeek.push(null);
    }

    // Fill in the days
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      currentWeek.push(dateStr);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill trailing empty cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return weeks;
  }, [year, month]);

  // Navigation
  const goToPrevMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const goToCurrentMonth = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }, []);

  const handleDayClick = useCallback(
    (date: string) => {
      onDaySelect?.(date);
    },
    [onDaySelect],
  );

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPrevMonth}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={goToCurrentMonth}
            className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
          >
            Today
          </button>
          <button
            onClick={goToNextMonth}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Next →
          </button>
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
        <div className="w-32" /> {/* Spacer for alignment */}
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-2 text-sm text-red-700 bg-red-50 border-b border-red-200">
          {error}
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="px-4 py-2 text-sm text-blue-700 bg-blue-50 border-b border-blue-200">
          Loading monthly data…
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-lg mx-auto">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_HEADER_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-xs font-semibold text-gray-500 py-2"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Weeks */}
          {calendarWeeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
              {week.map((date, dayIdx) => {
                if (!date) {
                  return <div key={`empty-${weekIdx}-${dayIdx}`} className="aspect-square" />;
                }

                const indicator = dayMap.get(date);
                const isToday = date === today;
                const hasPlan = indicator?.hasPlan ?? false;
                const mealCount = indicator?.mealCount ?? 0;
                const dayNum = date.slice(8);

                return (
                  <button
                    key={date}
                    onClick={() => handleDayClick(date)}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-colors relative ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : hasPlan
                        ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isToday ? 'text-white' : ''}`}>
                      {parseInt(dayNum, 10)}
                    </span>
                    {hasPlan && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        {Array.from({ length: Math.min(mealCount, 4) }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              isToday ? 'bg-white' : 'bg-emerald-500'
                            }`}
                          />
                        ))}
                      </div>
                    )}
                    {mealCount > 4 && (
                      <span className={`text-[9px] ${isToday ? 'text-blue-200' : 'text-emerald-600'}`}>
                        +{mealCount - 4}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-600" />
              <span>Today</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Has meals planned</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
