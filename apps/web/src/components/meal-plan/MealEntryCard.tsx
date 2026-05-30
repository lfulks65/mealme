/**
 * @module MealEntryCard
 * Detail card for a meal plan entry — shows recipe info with
 * options to remove or swap the assigned recipe.
 */

'use client';

import React from 'react';
import type { MealPlanEntryWithRecipe } from '@mealme/api';
import { MEAL_SLOT_LABELS } from '../../constants/meal-plan';

interface MealEntryCardProps {
  entry: MealPlanEntryWithRecipe;
  onRemove: () => void;
  onSwap: () => void;
  onClose: () => void;
}

export function MealEntryCard({ entry, onRemove, onSwap, onClose }: MealEntryCardProps) {
  const recipe = entry.recipe;
  const slotLabel = MEAL_SLOT_LABELS[entry.meal_slot] ?? entry.meal_slot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">
            {slotLabel} — {entry.date}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-200 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Recipe info */}
        {recipe ? (
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              {recipe.image_urls?.[0] && (
                <img
                  src={recipe.image_urls[0]}
                  alt={recipe.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-gray-900">{recipe.title}</h4>
                {recipe.description && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{recipe.description}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Prep</div>
                <div className="text-sm font-medium">{recipe.prep_time_minutes}m</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Cook</div>
                <div className="text-sm font-medium">{recipe.cook_time_minutes}m</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <div className="text-xs text-gray-500">Servings</div>
                <div className="text-sm font-medium">{entry.servings}</div>
              </div>
            </div>

            {recipe.dietary_tags && recipe.dietary_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {recipe.dietary_tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {recipe.cuisine_type && (
              <div className="text-sm text-gray-600">
                Cuisine: <span className="font-medium">{recipe.cuisine_type}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-gray-500">
            No recipe assigned
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-4 py-3 border-t bg-gray-50">
          <button
            onClick={onSwap}
            className="flex-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            🔄 Swap Recipe
          </button>
          <button
            onClick={onRemove}
            className="flex-1 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            🗑️ Remove
          </button>
        </div>
      </div>
    </div>
  );
}
