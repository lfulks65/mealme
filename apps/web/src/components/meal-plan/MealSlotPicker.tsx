/**
 * @module MealSlotPicker
 * Recipe selection screen for a specific meal slot.
 *
 * Shows recommended recipes first, then a search/browse interface.
 * Selecting a recipe assigns it to the slot.
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import type { MealSlot } from '@mealme/shared';
import { MEAL_SLOT_LABELS } from '../../constants/meal-plan';

// Simple recipe shape for the picker (could come from API)
interface PickerRecipe {
  id: string;
  title: string;
  description: string | null;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings: number;
  difficulty: string;
  imageUrls: string[];
  dietaryTags: string[];
  cuisineType: string | null;
}

interface MealSlotPickerProps {
  date: string;
  mealSlot: MealSlot;
  onSelect: (recipeId: string) => void;
  onClose: () => void;
}

// Placeholder recommended recipes (in production, these would come from API)
const RECOMMENDED_RECIPES: PickerRecipe[] = [
  {
    id: 'rec-1',
    title: 'Avocado Toast with Eggs',
    description: 'Classic breakfast with perfectly poached eggs',
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    servings: 2,
    difficulty: 'easy',
    imageUrls: [],
    dietaryTags: ['vegetarian'],
    cuisineType: 'american',
  },
  {
    id: 'rec-2',
    title: 'Grilled Chicken Salad',
    description: 'Fresh greens with grilled chicken breast',
    prepTimeMinutes: 10,
    cookTimeMinutes: 15,
    servings: 4,
    difficulty: 'easy',
    imageUrls: [],
    dietaryTags: ['gluten-free'],
    cuisineType: 'american',
  },
  {
    id: 'rec-3',
    title: 'Spaghetti Bolognese',
    description: 'Rich meat sauce over al dente pasta',
    prepTimeMinutes: 10,
    cookTimeMinutes: 30,
    servings: 4,
    difficulty: 'medium',
    imageUrls: [],
    dietaryTags: [],
    cuisineType: 'italian',
  },
  {
    id: 'rec-4',
    title: 'Overnight Oats',
    description: 'Prep the night before for a quick breakfast',
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    servings: 2,
    difficulty: 'easy',
    imageUrls: [],
    dietaryTags: ['vegetarian', 'vegan'],
    cuisineType: 'american',
  },
  {
    id: 'rec-5',
    title: 'Stir-Fry Vegetables',
    description: 'Quick and healthy vegetable stir-fry',
    prepTimeMinutes: 10,
    cookTimeMinutes: 10,
    servings: 3,
    difficulty: 'easy',
    imageUrls: [],
    dietaryTags: ['vegan', 'gluten-free'],
    cuisineType: 'asian',
  },
  {
    id: 'rec-6',
    title: 'Salmon with Roasted Vegetables',
    description: 'Omega-3 rich salmon with seasonal veggies',
    prepTimeMinutes: 10,
    cookTimeMinutes: 25,
    servings: 4,
    difficulty: 'medium',
    imageUrls: [],
    dietaryTags: ['gluten-free', 'dairy-free'],
    cuisineType: 'american',
  },
  {
    id: 'rec-7',
    title: 'Turkey Wrap',
    description: 'Light lunch with fresh veggies',
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    servings: 2,
    difficulty: 'easy',
    imageUrls: [],
    dietaryTags: [],
    cuisineType: 'american',
  },
  {
    id: 'rec-8',
    title: 'Fruit Smoothie Bowl',
    description: 'Refreshing blend of fruits and toppings',
    prepTimeMinutes: 5,
    cookTimeMinutes: 0,
    servings: 1,
    difficulty: 'easy',
    imageUrls: [],
    dietaryTags: ['vegan', 'gluten-free'],
    cuisineType: 'american',
  },
];

export function MealSlotPicker({ date, mealSlot, onSelect, onClose }: MealSlotPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'recommended' | 'search'>('recommended');

  const slotLabel = MEAL_SLOT_LABELS[mealSlot] ?? mealSlot;

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return RECOMMENDED_RECIPES;
    const q = searchQuery.toLowerCase();
    return RECOMMENDED_RECIPES.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q) ||
        r.cuisineType?.toLowerCase().includes(q) ||
        r.dietaryTags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const handleSelect = useCallback(
    (recipeId: string) => {
      onSelect(recipeId);
    },
    [onSelect],
  );

  const recipes = activeTab === 'recommended' ? RECOMMENDED_RECIPES : filteredRecipes;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Choose Recipe</h3>
            <p className="text-sm text-gray-500">
              {slotLabel} · {date}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('recommended')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'recommended'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            ⭐ Recommended
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === 'search'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🔍 Search & Browse
          </button>
        </div>

        {/* Search bar (visible in search tab) */}
        {activeTab === 'search' && (
          <div className="px-4 py-2 border-b">
            <input
              type="text"
              placeholder="Search recipes by name, cuisine, or dietary tag…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              autoFocus
            />
          </div>
        )}

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto">
          {recipes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="text-lg">No recipes found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recipes.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    onClick={() => handleSelect(recipe.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {recipe.imageUrls[0] ? (
                        <img
                          src={recipe.imageUrls[0]}
                          alt={recipe.title}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">
                          🍽️
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900">{recipe.title}</div>
                        {recipe.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {recipe.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min</span>
                          <span>·</span>
                          <span>{recipe.servings} servings</span>
                          <span>·</span>
                          <span className="capitalize">{recipe.difficulty}</span>
                        </div>
                        {recipe.dietaryTags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {recipe.dietaryTags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
