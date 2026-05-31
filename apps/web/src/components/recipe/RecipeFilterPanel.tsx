/**
 * @module RecipeFilterPanel
 * Collapsible filter panel for recipe search.
 *
 * Provides cuisine, difficulty, dietary, max prep time,
 * and sort filter controls. Collapsed on mobile, expanded
 * on desktop. Shows active filter count in toggle button.
 */

'use client';

import { useState } from 'react';
import { CUISINE_PREFERENCES_ARRAY, DIETARY_RESTRICTIONS_ARRAY } from '@mealme/shared';
import type { RecipeDifficulty, RecipeSortOption } from '@mealme/shared';

interface RecipeFilterPanelProps {
  cuisine: string;
  difficulty: RecipeDifficulty | '';
  dietary: string[];
  maxPrep: number | '';
  sort: RecipeSortOption;
  activeFilterCount: number;
  onCuisineChange: (cuisine: string) => void;
  onDifficultyChange: (difficulty: RecipeDifficulty | '') => void;
  onToggleDietary: (restriction: string) => void;
  onClearDietary: () => void;
  onMaxPrepChange: (maxPrep: number | '') => void;
  onSortChange: (sort: RecipeSortOption) => void;
  onClearFilters: () => void;
}

const DIFFICULTY_OPTIONS: { value: RecipeDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const MAX_PREP_OPTIONS: { value: number | ''; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 15, label: '≤ 15 min' },
  { value: 30, label: '≤ 30 min' },
  { value: 45, label: '≤ 45 min' },
  { value: 60, label: '≤ 60 min' },
];

const SORT_OPTIONS: { value: RecipeSortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'prep_time', label: 'Prep Time' },
  { value: 'newest', label: 'Newest' },
];

export function RecipeFilterPanel({
  cuisine,
  difficulty,
  dietary,
  maxPrep,
  sort,
  activeFilterCount,
  onCuisineChange,
  onDifficultyChange,
  onToggleDietary,
  onClearDietary,
  onMaxPrepChange,
  onSortChange,
  onClearFilters,
}: RecipeFilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button
            onClick={onClearFilters}
            className="text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter panel — always visible on desktop, toggleable on mobile */}
      <div className={`space-y-5 ${isOpen ? 'block' : 'hidden'} lg:block`}>
        {/* Sort */}
        <FilterSection
          title="Sort by"
          onReset={sort !== 'relevance' ? () => onSortChange('relevance') : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onSortChange(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  sort === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Cuisine */}
        <FilterSection title="Cuisine" onReset={cuisine ? () => onCuisineChange('') : undefined}>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onCuisineChange('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                cuisine === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {CUISINE_PREFERENCES_ARRAY.map((c: { id: string; label: string; emoji: string }) => (
              <button
                key={c.id}
                onClick={() => onCuisineChange(cuisine === c.id ? '' : c.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  cuisine === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{c.emoji}</span>
                {c.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Difficulty */}
        <FilterSection
          title="Difficulty"
          onReset={difficulty ? () => onDifficultyChange('') : undefined}
        >
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onDifficultyChange('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                difficulty === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Any
            </button>
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onDifficultyChange(difficulty === opt.value ? '' : opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  difficulty === opt.value
                    ? opt.value === 'easy'
                      ? 'bg-green-600 text-white'
                      : opt.value === 'medium'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Dietary restrictions */}
        <FilterSection
          title="Dietary"
          onReset={dietary.length > 0 ? () => onClearDietary() : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {DIETARY_RESTRICTIONS_ARRAY.map((d: { id: string; label: string; icon: string }) => (
              <button
                key={d.id}
                onClick={() => onToggleDietary(d.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  dietary.includes(d.id)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{d.icon}</span>
                {d.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Max prep time */}
        <FilterSection
          title="Max Prep Time"
          onReset={maxPrep !== '' ? () => onMaxPrepChange('') : undefined}
        >
          <div className="flex flex-wrap gap-2">
            {MAX_PREP_OPTIONS.map((opt) => (
              <button
                key={String(opt.value)}
                onClick={() => onMaxPrepChange(opt.value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  maxPrep === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Clear all (desktop) */}
        {activeFilterCount > 0 && (
          <div className="hidden lg:block pt-2 border-t border-gray-100">
            <button
              onClick={onClearFilters}
              className="text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-component ────────────────────────────────────────────────────────────

function FilterSection({
  title,
  onReset,
  children,
}: {
  title: string;
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        {onReset && (
          <button
            onClick={onReset}
            className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
