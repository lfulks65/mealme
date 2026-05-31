/**
 * @module RecipeSearchClient
 * Client component for interactive recipe search with infinite scroll.
 *
 * Uses React Query's useInfiniteQuery for pagination,
 * IntersectionObserver for infinite scroll, and URL-synced
 * filter state for shareable/bookmarkable search URLs.
 */

'use client';

import { useRef, useCallback, useEffect } from 'react';
import { useRecipeSearch } from '@/hooks/useRecipeSearch';
import { useRecipeSearchFilters } from '@/hooks/useRecipeSearchFilters';
import { RecipeCard } from './RecipeCard';
import { RecipeFilterPanel } from './RecipeFilterPanel';

/** Skeleton card for loading state. */
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="h-48 animate-pulse bg-gray-200" />
      <div className="space-y-3 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-3">
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
          <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

/** Loading skeleton grid. */
function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Empty state with contextual message. */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg
        className="mb-4 h-16 w-16 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1}
          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
        />
      </svg>
      <p className="text-lg font-medium text-gray-500">
        {hasFilters
          ? 'No recipes match your filters. Try adjusting your search.'
          : 'No recipes found. Start by searching or browsing.'}
      </p>
    </div>
  );
}

export function RecipeSearchClient() {
  const {
    filters,
    searchFilters,
    queryInput,
    setQueryInput,
    setCuisine,
    setDifficulty,
    toggleDietary,
    setMaxPrep,
    setSort,
    clearFilters,
    activeFilterCount,
  } = useRecipeSearchFilters();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, error } =
    useRecipeSearch(searchFilters);

  // Flatten pages into single recipe list
  const recipes = data?.pages.flatMap((p) => p.recipes) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Infinite scroll sentinel ref
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const hasFilters = activeFilterCount > 0;

  return (
    <div className="space-y-6">
      {/* Search input */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="text"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
          placeholder="Search recipes..."
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {queryInput && (
          <button
            onClick={() => setQueryInput('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Filter panel */}
      <RecipeFilterPanel
        cuisine={filters.cuisine}
        difficulty={filters.difficulty}
        dietary={filters.dietary}
        maxPrep={filters.maxPrep}
        sort={filters.sort}
        activeFilterCount={activeFilterCount}
        onCuisineChange={setCuisine}
        onDifficultyChange={setDifficulty}
        onToggleDietary={toggleDietary}
        onMaxPrepChange={setMaxPrep}
        onSortChange={setSort}
        onClearFilters={clearFilters}
      />

      {/* Results info */}
      {!isLoading && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {recipes.length > 0
              ? `Showing ${recipes.length} of ${total} recipe${total !== 1 ? 's' : ''}`
              : hasFilters
                ? 'No matching recipes'
                : ''}
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && <SkeletonGrid />}

      {/* Results */}
      {!isLoading && recipes.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && recipes.length === 0 && !isError && <EmptyState hasFilters={hasFilters} />}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {/* Next page loading spinner */}
      {isFetchingNextPage && (
        <div className="flex items-center justify-center py-8">
          <svg className="h-6 w-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="ml-2 text-sm text-gray-500">Loading more recipes...</span>
        </div>
      )}

      {/* End of results */}
      {!hasNextPage && recipes.length > 0 && !isFetchingNextPage && (
        <p className="py-4 text-center text-sm text-gray-400">
          You&apos;ve seen all {total} recipe{total !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
