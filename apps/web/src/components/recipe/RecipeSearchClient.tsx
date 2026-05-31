/**
 * @module RecipeSearchClient
 * Client component for interactive recipe search.
 *
 * Provides debounced search input, filter toggles for cuisine
 * and dietary restrictions, and triggers server-side navigation
 * via URL search params.
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect, useRef } from 'react';

interface RecipeSearchClientProps {
  availableCuisines: string[];
  availableDietaryRestrictions: string[];
}

export function RecipeSearchClient({
  availableCuisines,
  availableDietaryRestrictions,
}: RecipeSearchClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get('q') ?? '';
  const initialCuisine = searchParams.get('cuisine') ?? '';
  const initialDietary = searchParams.get('dietary')?.split(',').filter(Boolean) ?? [];

  const [query, setQuery] = useState(initialQuery);
  const [selectedCuisine, setSelectedCuisine] = useState(initialCuisine);
  const [selectedDietary, setSelectedDietary] = useState<string[]>(initialDietary);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Build URL with search params and navigate
  const navigateToSearch = useCallback(
    (q: string, cuisine: string, dietary: string[]) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (cuisine) params.set('cuisine', cuisine);
      if (dietary.length > 0) params.set('dietary', dietary.join(','));

      const search = params.toString();
      router.push(`/recipes/search${search ? `?${search}` : ''}`);
    },
    [router],
  );

  // Debounced search on query change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      navigateToSearch(query, selectedCuisine, selectedDietary);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCuisine, selectedDietary, navigateToSearch]);

  const toggleDietary = (restriction: string) => {
    setSelectedDietary((prev) =>
      prev.includes(restriction)
        ? prev.filter((r) => r !== restriction)
        : [...prev, restriction],
    );
  };

  return (
    <div className="space-y-4">
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
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes..."
          className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Cuisine filter */}
      {availableCuisines.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">Cuisine</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCuisine('')}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCuisine === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {availableCuisines.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() =>
                  setSelectedCuisine(selectedCuisine === cuisine ? '' : cuisine)
                }
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                  selectedCuisine === cuisine
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cuisine}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dietary restriction filter */}
      {availableDietaryRestrictions.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-700">
            Dietary Restrictions
          </h3>
          <div className="flex flex-wrap gap-2">
            {availableDietaryRestrictions.map((restriction) => (
              <button
                key={restriction}
                onClick={() => toggleDietary(restriction)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDietary.includes(restriction)
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {restriction}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
