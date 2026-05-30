/**
 * usePreferences — React hook for preference persistence via Supabase
 *
 * Provides a convenient hook for loading, saving, and aggregating
 * family and member preferences. Wraps the @mealme/api preference
 * functions with React state management.
 *
 * Usage:
 *   const { familyPrefs, aggregated, loading, saveFamily, saveMember } =
 *     usePreferences({ familyId: 'xxx', currentUserId: 'yyy', members: [...] });
 */
import { useCallback, useEffect, useState } from 'react';
import {
  getFamilyPreferences,
  upsertFamilyPreferences,
  getMemberPreferences,
  upsertMemberPreferences,
  getAggregatedPreferences,
} from '@mealme/api';
import type {
  FamilyPreferencesRow,
  MemberPreferencesRow,
  AggregatedPreferences,
  UpsertFamilyPreferencesInput,
  UpsertMemberPreferencesInput,
} from '@mealme/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UsePreferencesConfig {
  /** The family ID to manage preferences for. */
  familyId: string;
  /** Current user ID (for own member preferences). */
  currentUserId: string;
  /** Member user IDs to load preferences for. */
  memberIds?: string[];
  /** Whether to load on mount (default: true). */
  autoLoad?: boolean;
}

export interface UsePreferencesResult {
  /** Family-level preferences row (null if not set). */
  familyPrefs: FamilyPreferencesRow | null;
  /** Per-member preferences map (userId → row). */
  memberPrefsMap: Record<string, MemberPreferencesRow | null>;
  /** Aggregated preferences (null if not computed). */
  aggregated: AggregatedPreferences | null;
  /** Whether data is currently loading. */
  loading: boolean;
  /** Whether a save operation is in progress. */
  saving: boolean;
  /** Last error message (null if no error). */
  error: string | null;

  /** Reload all preferences from Supabase. */
  reload: () => Promise<void>;
  /** Compute aggregated preferences from Supabase. */
  loadAggregated: () => Promise<void>;

  /** Save family-level preferences. */
  saveFamily: (input: UpsertFamilyPreferencesInput) => Promise<FamilyPreferencesRow | null>;
  /** Save member-level preferences for a specific user. */
  saveMember: (userId: string, input: UpsertMemberPreferencesInput) => Promise<MemberPreferencesRow | null>;

  /** Clear the current error. */
  clearError: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePreferences({
  familyId,
  currentUserId: _currentUserId,
  memberIds = [],
  autoLoad = true,
}: UsePreferencesConfig): UsePreferencesResult {
  const [familyPrefs, setFamilyPrefs] = useState<FamilyPreferencesRow | null>(null);
  const [memberPrefsMap, setMemberPrefsMap] = useState<Record<string, MemberPreferencesRow | null>>({});
  const [aggregated, setAggregated] = useState<AggregatedPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load all preferences ───────────────────────────────────────────────

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load family preferences
      const familyResult = await getFamilyPreferences(familyId);
      if (familyResult.error) {
        // Not found is okay — means no prefs set yet
        if (!familyResult.error.includes('not found')) {
          setError(familyResult.error);
        }
        setFamilyPrefs(null);
      } else {
        setFamilyPrefs(familyResult.preferences);
      }

      // Load member preferences
      const memberMap: Record<string, MemberPreferencesRow | null> = {};
      await Promise.all(
        memberIds.map(async (userId) => {
          const result = await getMemberPreferences(familyId, userId);
          memberMap[userId] = result.error ? null : result.preferences;
        }),
      );
      setMemberPrefsMap(memberMap);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load preferences');
    } finally {
      setLoading(false);
    }
  }, [familyId, memberIds]);

  // ── Load aggregated preferences ─────────────────────────────────────────

  const loadAggregated = useCallback(async () => {
    setError(null);

    try {
      const result = await getAggregatedPreferences(familyId);
      if (result.error) {
        setError(result.error);
        setAggregated(null);
      } else {
        setAggregated(result.preferences);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load aggregated preferences');
      setAggregated(null);
    }
  }, [familyId]);

  // ── Save family preferences ────────────────────────────────────────────

  const saveFamily = useCallback(
    async (input: UpsertFamilyPreferencesInput): Promise<FamilyPreferencesRow | null> => {
      setSaving(true);
      setError(null);

      try {
        const result = await upsertFamilyPreferences(familyId, input);
        if (result.error) {
          setError(result.error);
          return null;
        }
        setFamilyPrefs(result.preferences);
        return result.preferences;
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save family preferences');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [familyId],
  );

  // ── Save member preferences ────────────────────────────────────────────

  const saveMember = useCallback(
    async (userId: string, input: UpsertMemberPreferencesInput): Promise<MemberPreferencesRow | null> => {
      setSaving(true);
      setError(null);

      try {
        const result = await upsertMemberPreferences(familyId, userId, input);
        if (result.error) {
          setError(result.error);
          return null;
        }
        setMemberPrefsMap((prev) => ({
          ...prev,
          [userId]: result.preferences,
        }));
        return result.preferences;
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save member preferences');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [familyId],
  );

  // ── Clear error ────────────────────────────────────────────────────────

  const clearError = useCallback(() => setError(null), []);

  // ── Auto-load on mount ─────────────────────────────────────────────────

  useEffect(() => {
    if (autoLoad) {
      reload();
    }
  }, [autoLoad, reload]);

  return {
    familyPrefs,
    memberPrefsMap,
    aggregated,
    loading,
    saving,
    error,
    reload,
    loadAggregated,
    saveFamily,
    saveMember,
    clearError,
  };
}

export default usePreferences;
