/**
 * PreferencesContext — React context for family & member preferences
 *
 * Provides preference data and refresh functions to the component tree.
 * Wraps the @mealme/api preference functions with React state management
 * and context propagation.
 */
import React, { createContext, useContext, useCallback, useEffect, useState, useMemo } from 'react';
import {
  getFamilyPreferences,
  updateFamilyPreferences,
  getMemberPreferences,
  updateMemberPreferences,
} from '@mealme/api';
import type {
  FamilyPreferences,
  MemberPreferences,
  FamilyPreferencesInput,
  MemberPreferencesInput,
} from '@mealme/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreferencesContextValue {
  /** Family-level preferences (null if not set). */
  familyPreferences: FamilyPreferences | null;
  /** Per-member preferences map (memberId → preferences). */
  memberPreferences: Record<string, MemberPreferences | null>;
  /** Whether data is currently loading. */
  loading: boolean;
  /** Whether a save operation is in progress. */
  saving: boolean;
  /** Last error message (null if no error). */
  error: string | null;

  /** Reload family preferences from the API. */
  refreshFamilyPreferences: () => Promise<void>;
  /** Reload member preferences for a specific member. */
  refreshMemberPreferences: (memberId: string) => Promise<void>;
  /** Save family-level preferences. */
  saveFamilyPreferences: (input: FamilyPreferencesInput) => Promise<boolean>;
  /** Save member-level preferences for a specific member. */
  saveMemberPreferences: (memberId: string, input: MemberPreferencesInput) => Promise<boolean>;

  /** Clear the current error. */
  clearError: () => void;
}

export interface PreferencesProviderProps {
  /** The family ID to manage preferences for. */
  familyId: string;
  /** Family member IDs to load preferences for. */
  memberIds?: string[];
  /** Whether to load on mount (default: true). */
  autoLoad?: boolean;
  children: React.ReactNode;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function PreferencesProvider({
  familyId,
  memberIds = [],
  autoLoad = true,
  children,
}: PreferencesProviderProps) {
  const [familyPreferences, setFamilyPreferences] = useState<FamilyPreferences | null>(null);
  const [memberPreferences, setMemberPreferences] = useState<
    Record<string, MemberPreferences | null>
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Refresh family preferences ──────────────────────────────────────────

  const refreshFamilyPreferences = useCallback(async () => {
    setError(null);
    try {
      const result = await getFamilyPreferences(familyId);
      if (result.error && !result.error.includes('not found')) {
        setError(result.error);
        setFamilyPreferences(null);
      } else {
        setFamilyPreferences(result.preferences);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load family preferences');
      setFamilyPreferences(null);
    }
  }, [familyId]);

  // ── Refresh member preferences ─────────────────────────────────────────

  const refreshMemberPreferences = useCallback(async (memberId: string) => {
    setError(null);
    try {
      const result = await getMemberPreferences(memberId);
      setMemberPreferences((prev) => ({
        ...prev,
        [memberId]: result.error ? null : result.preferences,
      }));
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load member preferences');
    }
  }, []);

  // ── Refresh all member preferences ────────────────────────────────────

  const refreshAllMemberPreferences = useCallback(async () => {
    const results: Record<string, MemberPreferences | null> = {};
    await Promise.all(
      memberIds.map(async (mId) => {
        try {
          const result = await getMemberPreferences(mId);
          results[mId] = result.error ? null : result.preferences;
        } catch {
          results[mId] = null;
        }
      }),
    );
    setMemberPreferences(results);
  }, [memberIds]);

  // ── Save family preferences ────────────────────────────────────────────

  const saveFamilyPreferences = useCallback(
    async (input: FamilyPreferencesInput): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const result = await updateFamilyPreferences(familyId, input);
        if (result.error) {
          setError(result.error);
          return false;
        }
        setFamilyPreferences(result.preferences);
        return true;
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save family preferences');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [familyId],
  );

  // ── Save member preferences ───────────────────────────────────────────

  const saveMemberPreferences = useCallback(
    async (memberId: string, input: MemberPreferencesInput): Promise<boolean> => {
      setSaving(true);
      setError(null);
      try {
        const result = await updateMemberPreferences(memberId, input);
        if (result.error) {
          setError(result.error);
          return false;
        }
        setMemberPreferences((prev) => ({
          ...prev,
          [memberId]: result.preferences,
        }));
        return true;
      } catch (err: any) {
        setError(err?.message ?? 'Failed to save member preferences');
        return false;
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
      setLoading(true);
      Promise.all([refreshFamilyPreferences(), refreshAllMemberPreferences()]).finally(() =>
        setLoading(false),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, familyId]);

  // ── Context value ──────────────────────────────────────────────────────

  const value = useMemo<PreferencesContextValue>(
    () => ({
      familyPreferences,
      memberPreferences,
      loading,
      saving,
      error,
      refreshFamilyPreferences,
      refreshMemberPreferences,
      saveFamilyPreferences,
      saveMemberPreferences,
      clearError,
    }),
    [
      familyPreferences,
      memberPreferences,
      loading,
      saving,
      error,
      refreshFamilyPreferences,
      refreshMemberPreferences,
      saveFamilyPreferences,
      saveMemberPreferences,
      clearError,
    ],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePreferencesContext(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferencesContext must be used within a <PreferencesProvider>');
  }
  return ctx;
}

export default PreferencesContext;
