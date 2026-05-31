/**
 * @module useRecipeSearchFilters
 * Filter state management with URL sync for recipe search.
 *
 * Reads/writes filters from URL search params, debounces text
 * search, and provides helpers for manipulating filter state.
 */

'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { RecipeSearchFilters, RecipeDifficulty, RecipeSortOption } from '@mealme/shared';

interface FilterState {
  query: string;
  cuisine: string;
  difficulty: RecipeDifficulty | '';
  dietary: string[];
  maxPrep: number | '';
  sort: RecipeSortOption;
  tags: string[];
}

const DEBOUNCE_MS = 400;

export function useRecipeSearchFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Read initial state from URL
  const readFiltersFromURL = useCallback((): FilterState => {
    return {
      query: searchParams.get('q') ?? '',
      cuisine: searchParams.get('cuisine') ?? '',
      difficulty: (searchParams.get('difficulty') as RecipeDifficulty) ?? '',
      dietary: searchParams.get('dietary')?.split(',').filter(Boolean) ?? [],
      maxPrep: searchParams.get('maxPrep') ? Number(searchParams.get('maxPrep')) : '',
      sort: (searchParams.get('sort') as RecipeSortOption) ?? 'relevance',
      tags: searchParams.get('tags')?.split(',').filter(Boolean) ?? [],
    };
  }, [searchParams]);

  const [filters, setFilters] = useState<FilterState>(readFiltersFromURL);

  // Debounced query input state (separate from URL-synced state)
  const [queryInput, setQueryInput] = useState(filters.query);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync URL → state on navigation (back/forward)
  useEffect(() => {
    const urlFilters = readFiltersFromURL();
    setFilters(urlFilters);
    setQueryInput(urlFilters.query);
  }, [readFiltersFromURL]);

  // Write current filters to URL
  const syncToURL = useCallback(
    (next: FilterState) => {
      const params = new URLSearchParams();
      if (next.query.trim()) params.set('q', next.query.trim());
      if (next.cuisine) params.set('cuisine', next.cuisine);
      if (next.difficulty) params.set('difficulty', next.difficulty);
      if (next.dietary.length > 0) params.set('dietary', next.dietary.join(','));
      if (next.maxPrep !== '') params.set('maxPrep', String(next.maxPrep));
      if (next.sort !== 'relevance') params.set('sort', next.sort);
      if (next.tags.length > 0) params.set('tags', next.tags.join(','));

      const search = params.toString();
      router.replace(`${pathname}${search ? `?${search}` : ''}`, { scroll: false });
    },
    [router, pathname],
  );

  // Debounced query update
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters((prev) => {
        const next = { ...prev, query: queryInput };
        syncToURL(next);
        return next;
      });
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [queryInput, syncToURL]);

  const setCuisine = useCallback(
    (cuisine: string) => {
      setFilters((prev) => {
        const next = { ...prev, cuisine };
        syncToURL(next);
        return next;
      });
    },
    [syncToURL],
  );

  const setDifficulty = useCallback(
    (difficulty: RecipeDifficulty | '') => {
      setFilters((prev) => {
        const next = { ...prev, difficulty };
        syncToURL(next);
        return next;
      });
    },
    [syncToURL],
  );

  const toggleDietary = useCallback(
    (restriction: string) => {
      setFilters((prev) => {
        const dietary = prev.dietary.includes(restriction)
          ? prev.dietary.filter((r) => r !== restriction)
          : [...prev.dietary, restriction];
        const next = { ...prev, dietary };
        syncToURL(next);
        return next;
      });
    },
    [syncToURL],
  );

  const setMaxPrep = useCallback(
    (maxPrep: number | '') => {
      setFilters((prev) => {
        const next = { ...prev, maxPrep };
        syncToURL(next);
        return next;
      });
    },
    [syncToURL],
  );

  const setSort = useCallback(
    (sort: RecipeSortOption) => {
      setFilters((prev) => {
        const next = { ...prev, sort };
        syncToURL(next);
        return next;
      });
    },
    [syncToURL],
  );

  const toggleTag = useCallback(
    (tag: string) => {
      setFilters((prev) => {
        const tags = prev.tags.includes(tag)
          ? prev.tags.filter((t) => t !== tag)
          : [...prev.tags, tag];
        const next = { ...prev, tags };
        syncToURL(next);
        return next;
      });
    },
    [syncToURL],
  );

  const clearFilters = useCallback(() => {
    const empty: FilterState = {
      query: '',
      cuisine: '',
      difficulty: '',
      dietary: [],
      maxPrep: '',
      sort: 'relevance',
      tags: [],
    };
    setFilters(empty);
    setQueryInput('');
    syncToURL(empty);
  }, [syncToURL]);

  // Count active (non-default) filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.cuisine) count++;
    if (filters.difficulty) count++;
    if (filters.dietary.length > 0) count++;
    if (filters.maxPrep !== '') count++;
    if (filters.sort !== 'relevance') count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // Build RecipeSearchFilters for the search hook
  const searchFilters: RecipeSearchFilters = useMemo(
    () => ({
      query: filters.query || undefined,
      cuisine: filters.cuisine || undefined,
      difficulty: filters.difficulty || undefined,
      dietary_restrictions: filters.dietary.length > 0 ? filters.dietary : undefined,
      max_prep_minutes: filters.maxPrep !== '' ? Number(filters.maxPrep) : undefined,
      sort: filters.sort,
      tags: filters.tags.length > 0 ? filters.tags : undefined,
    }),
    [filters],
  );

  return {
    filters,
    searchFilters,
    queryInput,
    setQueryInput,
    setCuisine,
    setDifficulty,
    toggleDietary,
    setMaxPrep,
    setSort,
    toggleTag,
    clearFilters,
    activeFilterCount,
  };
}
