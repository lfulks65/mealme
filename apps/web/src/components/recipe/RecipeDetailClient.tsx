/**
 * @module RecipeDetailClient
 * Client component for interactive recipe detail features.
 *
 * Handles servings adjustment, save-to-meal-plan, share,
 * and other interactive features on the recipe detail page.
 */

'use client';

import { useState } from 'react';
import type {
  RecipeFull,
  RecipeIngredientDB,
  RecipeStepDB,
  RecipeTag,
  RecipeDietaryInfo,
} from '@mealme/shared';

interface RecipeDetailClientProps {
  recipe: RecipeFull;
}

/** Format minutes into a human-readable string. */
function formatTime(minutes: number | null): string {
  if (minutes == null) return '—';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function RecipeDetailClient({ recipe }: RecipeDetailClientProps) {
  const baseServings = recipe.servings ?? 1;
  const [servingsMultiplier, setServingsMultiplier] = useState(1);
  const [saved, setSaved] = useState(false);

  const adjustedServings = Math.round(baseServings * servingsMultiplier);

  const adjustIngredientQuantity = (quantity: string): string => {
    const num = parseFloat(quantity);
    if (isNaN(num)) return quantity;
    const adjusted = num * servingsMultiplier;
    // Show clean numbers (e.g., 2 instead of 2.0)
    return adjusted % 1 === 0
      ? adjusted.toFixed(0)
      : adjusted.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{recipe.title}</h1>
        {recipe.description && <p className="mt-2 text-lg text-gray-600">{recipe.description}</p>}

        {/* Action buttons */}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => setSaved(!saved)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              saved ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <svg
              className="h-4 w-4"
              fill={saved ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
              />
            </svg>
            {saved ? 'Saved' : 'Save Recipe'}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: recipe.title,
                  url: `/recipes/${recipe.id}`,
                });
              }
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {recipe.prep_minutes != null && (
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">Prep Time</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatTime(recipe.prep_minutes)}
            </p>
          </div>
        )}
        {recipe.cook_minutes != null && (
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">Cook Time</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {formatTime(recipe.cook_minutes)}
            </p>
          </div>
        )}
        <div className="rounded-lg bg-gray-50 p-4 text-center">
          <p className="text-sm text-gray-500">Servings</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">{adjustedServings}</p>
        </div>
        {recipe.calories != null && (
          <div className="rounded-lg bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-500">Calories</p>
            <p className="mt-1 text-lg font-semibold text-gray-900">{recipe.calories}</p>
          </div>
        )}
      </div>

      {/* Servings adjuster */}
      <div className="mb-8 flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <span className="text-sm font-medium text-gray-700">Adjust Servings:</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setServingsMultiplier(Math.max(0.5, servingsMultiplier - 0.5))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center font-medium">{adjustedServings}</span>
          <button
            onClick={() => setServingsMultiplier(servingsMultiplier + 0.5)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100"
          >
            +
          </button>
        </div>
        <span className="text-xs text-gray-500">(base: {baseServings})</span>
      </div>

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ingredient: RecipeIngredientDB) => (
              <li
                key={ingredient.id}
                className="flex items-start gap-3 rounded-lg bg-gray-50 px-4 py-2"
              >
                <span className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-full border-2 border-gray-300" />
                <span className="text-sm text-gray-700">
                  <span className="font-medium">
                    {adjustIngredientQuantity(ingredient.quantity)}
                  </span>{' '}
                  {ingredient.unit} {ingredient.name}
                  {ingredient.optional && (
                    <span className="ml-1 text-xs text-gray-400">(optional)</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Instructions</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step: RecipeStepDB) => (
              <li key={step.id} className="flex gap-4">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {step.step_number}
                </span>
                <div className="flex-1 pt-1">
                  <p className="text-sm text-gray-700">{step.instruction}</p>
                  {step.timer_minutes != null && step.timer_minutes > 0 && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {step.timer_minutes} min
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Tags */}
      {recipe.tags.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Tags</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.tags.map((tag: RecipeTag) => (
              <span
                key={tag.id}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
              >
                {tag.tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dietary info */}
      {recipe.dietary_info.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xl font-semibold text-gray-900">Dietary Information</h2>
          <div className="flex flex-wrap gap-2">
            {recipe.dietary_info.map((di: RecipeDietaryInfo) => (
              <span
                key={di.id}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  di.is_compliant ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {di.restriction} {di.is_compliant ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Source */}
      {recipe.source_url && (
        <div className="border-t border-gray-200 pt-6">
          <p className="text-sm text-gray-500">
            Source:{' '}
            <a
              href={recipe.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {recipe.source_url}
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
