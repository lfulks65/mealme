/**
 * @module org/context
 * React context and hook for organization state management.
 *
 * OrgProvider wraps the React tree and provides:
 *   - currentOrg: the active organization (or null)
 *   - orgs: all orgs where the user is a member
 *   - switchOrg: change the active org
 *   - createOrg: create a new org (also sets it as current)
 *   - loading / error state
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  createOrg as apiCreateOrg,
  getOrg as apiGetOrg,
  listUserOrgs as apiListUserOrgs,
  updateOrg as apiUpdateOrg,
  deleteOrg as apiDeleteOrg,
} from './functions';
import type {
  OrgWithRole,
  CreateOrgInput,
  UpdateOrgInput,
  OrgResult,
  OrgListResult,
  OrgDeleteResult,
} from './types';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

export interface OrgContextType {
  /** The currently active organization. */
  currentOrg: OrgWithRole | null;
  /** All organizations where the current user is a member. */
  orgs: OrgWithRole[];
  /** Switch the active organization by ID. */
  switchOrg: (orgId: string) => void;
  /** Create a new org and set it as current. */
  createOrg: (input: CreateOrgInput) => Promise<OrgResult>;
  /** Fetch a single org by ID. */
  getOrg: (id: string) => Promise<OrgResult>;
  /** Update an org (admin+ only). */
  updateOrg: (id: string, data: UpdateOrgInput) => Promise<OrgResult>;
  /** Soft-delete an org (owner only). */
  deleteOrg: (id: string) => Promise<OrgDeleteResult>;
  /** Refresh the org list from Supabase. */
  refreshOrgs: () => Promise<void>;
  /** Whether the org list is currently loading. */
  loading: boolean;
  /** Last error from an org operation. */
  error: string | null;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const [currentOrg, setCurrentOrg] = useState<OrgWithRole | null>(null);
  const [orgs, setOrgs] = useState<OrgWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // ----- Load orgs on mount -----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const result: OrgListResult = await apiListUserOrgs();

      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setOrgs(result.orgs);

      // Set current org to the first one if none is selected
      setCurrentOrg((prev) => {
        if (prev) {
          // If we already have a current org, keep it if it's still in the list
          const stillMember = result.orgs.some((o) => o.id === prev.id);
          return stillMember ? prev : result.orgs[0] ?? null;
        }
        return result.orgs[0] ?? null;
      });

      setLoading(false);
    }

    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      load();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // ----- switchOrg -----
  const switchOrg = useCallback(
    (orgId: string) => {
      const org = orgs.find((o) => o.id === orgId) ?? null;
      if (org) {
        setCurrentOrg(org);
        setError(null);
      } else {
        setError(`Organization ${orgId} not found in your memberships`);
      }
    },
    [orgs],
  );

  // ----- createOrg -----
  const handleCreateOrg = useCallback(
    async (input: CreateOrgInput): Promise<OrgResult> => {
      setLoading(true);
      setError(null);

      const result = await apiCreateOrg(input);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return result;
      }

      // Add the new org to the list and set it as current
      if (result.org) {
        setOrgs((prev) => [...prev, result.org!]);
        setCurrentOrg(result.org);
      }

      setLoading(false);
      return result;
    },
    [],
  );

  // ----- getOrg -----
  const handleGetOrg = useCallback(
    async (id: string): Promise<OrgResult> => {
      return apiGetOrg(id);
    },
    [],
  );

  // ----- updateOrg -----
  const handleUpdateOrg = useCallback(
    async (id: string, data: UpdateOrgInput): Promise<OrgResult> => {
      setError(null);

      const result = await apiUpdateOrg(id, data);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Update the org in the local list
      if (result.org) {
        setOrgs((prev) =>
          prev.map((o) => (o.id === id ? result.org! : o)),
        );

        // Update currentOrg if it's the one being edited
        setCurrentOrg((prev) => (prev?.id === id ? result.org! : prev));
      }

      return result;
    },
    [],
  );

  // ----- deleteOrg -----
  const handleDeleteOrg = useCallback(
    async (id: string): Promise<OrgDeleteResult> => {
      setError(null);

      const result = await apiDeleteOrg(id);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Remove the org from the list
      setOrgs((prev) => prev.filter((o) => o.id !== id));
      setCurrentOrg((prev) => {
        if (prev?.id === id) {
          // Switch to another org or null
          const remaining = orgs.filter((o) => o.id !== id);
          return remaining[0] ?? null;
        }
        return prev;
      });

      return result;
    },
    [orgs],
  );

  // ----- refreshOrgs -----
  const refreshOrgs = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await apiListUserOrgs();

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOrgs(result.orgs);
    setCurrentOrg((prev) => {
      if (prev) {
        const stillMember = result.orgs.some((o) => o.id === prev.id);
        return stillMember ? prev : result.orgs[0] ?? null;
      }
      return result.orgs[0] ?? null;
    });

    setLoading(false);
  }, []);

  const value: OrgContextType = {
    currentOrg,
    orgs,
    switchOrg,
    createOrg: handleCreateOrg,
    getOrg: handleGetOrg,
    updateOrg: handleUpdateOrg,
    deleteOrg: handleDeleteOrg,
    refreshOrgs,
    loading,
    error,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the organization context.
 *
 * Must be used within an <OrgProvider>.
 *
 * @example
 * ```tsx
 * function OrgSwitcher() {
 *   const { orgs, currentOrg, switchOrg, createOrg } = useOrg();
 *   // ...
 * }
 * ```
 */
export function useOrg(): OrgContextType {
  const context = useContext(OrgContext);
  if (context === undefined) {
    throw new Error('useOrg must be used within an OrgProvider');
  }
  return context;
}
