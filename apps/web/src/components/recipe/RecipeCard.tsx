/**
 * @module RecipeCard
 * Server Component for displaying a recipe card in a grid.
 *
 * Renders a recipe's image, title, cuisine, cook time, and
 * calorie count. Uses Tailwind CSS for styling and Next.js
 * Image component for optimized images.
 */

import Image from 'next/image';
import Link from 'next/link';
import type { RecipeFull, RecipeDietaryInfo } from '@mealme/shared';

interface RecipeCardProps {
  recipe: RecipeFull;
}

/** Format minutes into a human-readable string. */
function formatTime(minutes: number | null): string {
  if (minutes == null) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const totalTime = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group block overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden bg-gray-100">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400">
            <svg
              className="h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
              />
            </svg>
          </div>
        )}
        {/* Cuisine badge */}
        {recipe.cuisine && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium text-gray-700 backdrop-blur-sm">
            {recipe.cuisine}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="line-clamp-2 text-base font-semibold text-gray-900 group-hover:text-blue-600">
          {recipe.title}
        </h3>

        {recipe.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">
            {recipe.description}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(totalTime)}
            </span>
          )}
          {recipe.servings != null && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              {recipe.servings} servings
            </span>
          )}
          {recipe.calories != null && (
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
              </svg>
              {recipe.calories} cal
            </span>
          )}
        </div>

        {/* Dietary tags */}
        {recipe.dietary_info.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.dietary_info
              .filter((di: RecipeDietaryInfo) => di.is_compliant)
              .slice(0, 3)
              .map((di: RecipeDietaryInfo) => (
                <span
                  key={di.id}
                  className="inline-block rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                >
                  {di.restriction}
                </span>
              ))}
            {recipe.dietary_info.filter((di: RecipeDietaryInfo) => di.is_compliant).length > 3 && (
              <span className="inline-block rounded-full bg-gray-50 px-2 py-0.5 text-xs text-gray-500">
                +{recipe.dietary_info.filter((di: RecipeDietaryInfo) => di.is_compliant).length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
