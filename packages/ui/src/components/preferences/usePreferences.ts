/**
 * usePreferences — React hook for preference persistence via Supabase
 *
 * Provides a convenient hook for loading, saving, and aggregating
 * family and member preferences. Wraps the @mealme/api preference
 * functions with React state management.
 *
 * Usage:
 *   const { familyPrefs, aggregated, loading, saveFamily, saveMember } =
 *     usePreferences({ familyId: 'xxx', memberId: 'yyy', memberIds: [...] });
 */
import { useCallback, useEffect, useState } from 'react';
import {
  getFamilyPreferences,
  updateFamilyPreferences,
  getMemberPreferences,
  updateMemberPreferences,
  getAggregatedPreferences,
} from '@mealme/api';
import type {
  FamilyPreferences,
  MemberPreferences,
  AggregatedPreferences,
  FamilyPreferencesInput,
  MemberPreferencesInput,
} from '@mealme/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UsePreferencesConfig {
  /** The family ID to manage preferences for. */
  familyId: string;
  /** Current user's family member ID (for own member preferences). */
  memberId?: string;
  /** Family member IDs to load preferences for. */
  memberIds?: string[];
  /** Whether to load on mount (default: true). */
  autoLoad?: boolean;
}

export interface UsePreferencesResult {
  /** Family-level preferences (null if not set). */
  familyPrefs: FamilyPreferences | null;
  /** Per-member preferences map (memberId → preferences). */
  memberPrefsMap: Record<string, MemberPreferences | null>;
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
  saveFamily: (input: FamilyPreferencesInput) => Promise<FamilyPreferences | null>;
  /** Save member-level preferences for a specific family member. */
  saveMember: (
    memberId: string,
    input: MemberPreferencesInput,
  ) => Promise<MemberPreferences | null>;

  /** Clear the current error. */
  clearError: () => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePreferences({
  familyId,
  memberIds = [],
  autoLoad = true,
}: UsePreferencesConfig): UsePreferencesResult {
  const [familyPrefs, setFamilyPrefs] = useState<FamilyPreferences | null>(null);
  const [memberPrefsMap, setMemberPrefsMap] = useState<Record<string, MemberPreferences | null>>(
    {},
  );
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
      const memberMap: Record<string, MemberPreferences | null> = {};
      await Promise.all(
        memberIds.map(async (mId) => {
          const result = await getMemberPreferences(mId);
          memberMap[mId] = result.error ? null : result.preferences;
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
    async (input: FamilyPreferencesInput): Promise<FamilyPreferences | null> => {
      setSaving(true);
      setError(null);

      try {
        const result = await updateFamilyPreferences(familyId, input);
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
    async (mId: string, input: MemberPreferencesInput): Promise<MemberPreferences | null> => {
      setSaving(true);
      setError(null);

      try {
        const result = await updateMemberPreferences(mId, input);
        if (result.error) {
          setError(result.error);
          return null;
        }
        setMemberPrefsMap((prev) => ({
          ...prev,
          [mId]: result.preferences,
        }));
        return result.preferences;
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save member preferences');
        return null;
      } finally {
        setSaving(false);
      }
    },
    [],
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
