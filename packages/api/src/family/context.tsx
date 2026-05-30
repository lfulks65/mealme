/**
 * @module family/context
 * React context and hook for family state management.
 *
 * FamilyProvider wraps the React tree and provides:
 *   - currentFamily: the active family (or null)
 *   - families: all families in the current org where the user is a member
 *   - members: members of the current family
 *   - switchFamily: change the active family
 *   - createFamily: create a new family (also sets it as current)
 *   - addFamilyMember, removeFamilyMember, updateFamilyMemberRole
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
  createFamily as apiCreateFamily,
  getFamily as apiGetFamily,
  listFamilies as apiListFamilies,
  updateFamily as apiUpdateFamily,
  deleteFamily as apiDeleteFamily,
  addFamilyMember as apiAddFamilyMember,
  removeFamilyMember as apiRemoveFamilyMember,
  updateFamilyMemberRole as apiUpdateFamilyMemberRole,
  listFamilyMembers as apiListFamilyMembers,
} from './functions';
import type {
  FamilyWithRole,
  FamilyMember,
  CreateFamilyInput,
  UpdateFamilyInput,
  AddFamilyMemberInput,
  UpdateFamilyMemberRoleInput,
  FamilyResult,
  FamilyListResult,
  FamilyDeleteResult,
  FamilyMemberListResult,
  FamilyMemberResult,
} from './types';

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

export interface FamilyContextType {
  /** The currently active family. */
  currentFamily: FamilyWithRole | null;
  /** All families in the current org where the user is a member. */
  families: FamilyWithRole[];
  /** Members of the current family. */
  members: FamilyMember[];
  /** The org ID to scope families to. */
  orgId: string | null;
  /** Set the org ID and trigger a reload of families. */
  setOrgId: (orgId: string | null) => void;
  /** Switch the active family by ID. */
  switchFamily: (familyId: string) => void;
  /** Create a new family and set it as current. */
  createFamily: (input: CreateFamilyInput) => Promise<FamilyResult>;
  /** Fetch a single family by ID. */
  getFamily: (id: string) => Promise<FamilyResult>;
  /** Update a family. */
  updateFamily: (id: string, data: UpdateFamilyInput) => Promise<FamilyResult>;
  /** Soft-delete a family (owner only). */
  deleteFamily: (id: string) => Promise<FamilyDeleteResult>;
  /** Add a member to a family. */
  addFamilyMember: (input: AddFamilyMemberInput) => Promise<FamilyMemberResult>;
  /** Remove a member from a family. */
  removeFamilyMember: (familyId: string, userId: string) => Promise<FamilyMemberResult>;
  /** Update a family member's role. */
  updateFamilyMemberRole: (input: UpdateFamilyMemberRoleInput) => Promise<FamilyMemberResult>;
  /** Refresh the families list from Supabase. */
  refreshFamilies: () => Promise<void>;
  /** Refresh the members list for the current family. */
  refreshMembers: () => Promise<void>;
  /** Whether the family list is currently loading. */
  loading: boolean;
  /** Last error from a family operation. */
  error: string | null;
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [currentFamily, setCurrentFamily] = useState<FamilyWithRole | null>(null);
  const [families, setFamilies] = useState<FamilyWithRole[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [orgId, setOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  // ----- Load families when orgId changes -----
  useEffect(() => {
    if (!orgId) {
      setFamilies([]);
      setCurrentFamily(null);
      setMembers([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const result: FamilyListResult = await apiListFamilies(orgId!);

      if (cancelled) return;

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setFamilies(result.families);

      // Set current family to the first one if none is selected
      setCurrentFamily((prev) => {
        if (prev) {
          const stillMember = result.families.some((f) => f.id === prev.id);
          return stillMember ? prev : result.families[0] ?? null;
        }
        return result.families[0] ?? null;
      });

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // ----- Load members when currentFamily changes -----
  useEffect(() => {
    if (!currentFamily) {
      setMembers([]);
      return;
    }

    let cancelled = false;

    async function loadMembers() {
      const result: FamilyMemberListResult = await apiListFamilyMembers(currentFamily!.id);
      if (!cancelled) {
        if (result.error) {
          setError(result.error);
        } else {
          setMembers(result.members);
        }
      }
    }

    loadMembers();

    return () => {
      cancelled = true;
    };
  }, [currentFamily]);

  // ----- setOrgId -----
  const setOrgId = useCallback((newOrgId: string | null) => {
    setOrgIdState(newOrgId);
    initialLoadDone.current = false;
  }, []);

  // ----- switchFamily -----
  const switchFamily = useCallback(
    (familyId: string) => {
      const family = families.find((f) => f.id === familyId) ?? null;
      if (family) {
        setCurrentFamily(family);
        setError(null);
      } else {
        setError(`Family ${familyId} not found in your memberships`);
      }
    },
    [families],
  );

  // ----- createFamily -----
  const handleCreateFamily = useCallback(
    async (input: CreateFamilyInput): Promise<FamilyResult> => {
      setLoading(true);
      setError(null);

      const result = await apiCreateFamily(input);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return result;
      }

      // Add the new family to the list and set it as current
      if (result.family) {
        setFamilies((prev) => [...prev, result.family!]);
        setCurrentFamily(result.family);
      }

      setLoading(false);
      return result;
    },
    [],
  );

  // ----- getFamily -----
  const handleGetFamily = useCallback(
    async (id: string): Promise<FamilyResult> => {
      return apiGetFamily(id);
    },
    [],
  );

  // ----- updateFamily -----
  const handleUpdateFamily = useCallback(
    async (id: string, data: UpdateFamilyInput): Promise<FamilyResult> => {
      setError(null);

      const result = await apiUpdateFamily(id, data);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Update the family in the local list
      if (result.family) {
        setFamilies((prev) =>
          prev.map((f) => (f.id === id ? result.family! : f)),
        );

        // Update currentFamily if it's the one being edited
        setCurrentFamily((prev) => (prev?.id === id ? result.family! : prev));
      }

      return result;
    },
    [],
  );

  // ----- deleteFamily -----
  const handleDeleteFamily = useCallback(
    async (id: string): Promise<FamilyDeleteResult> => {
      setError(null);

      const result = await apiDeleteFamily(id);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Remove the family from the list
      setFamilies((prev) => prev.filter((f) => f.id !== id));
      setCurrentFamily((prev) => {
        if (prev?.id === id) {
          const remaining = families.filter((f) => f.id !== id);
          return remaining[0] ?? null;
        }
        return prev;
      });

      return result;
    },
    [families],
  );

  // ----- addFamilyMember -----
  const handleAddFamilyMember = useCallback(
    async (input: AddFamilyMemberInput): Promise<FamilyMemberResult> => {
      setError(null);

      const result = await apiAddFamilyMember(input);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Refresh members list
      if (currentFamily) {
        const memberResult = await apiListFamilyMembers(currentFamily.id);
        if (!memberResult.error) {
          setMembers(memberResult.members);
        }
      }

      return result;
    },
    [currentFamily],
  );

  // ----- removeFamilyMember -----
  const handleRemoveFamilyMember = useCallback(
    async (familyId: string, memberUserId: string): Promise<FamilyMemberResult> => {
      setError(null);

      const result = await apiRemoveFamilyMember(familyId, memberUserId);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Refresh members list
      if (currentFamily) {
        const memberResult = await apiListFamilyMembers(currentFamily.id);
        if (!memberResult.error) {
          setMembers(memberResult.members);
        }
      }

      return result;
    },
    [currentFamily],
  );

  // ----- updateFamilyMemberRole -----
  const handleUpdateFamilyMemberRole = useCallback(
    async (input: UpdateFamilyMemberRoleInput): Promise<FamilyMemberResult> => {
      setError(null);

      const result = await apiUpdateFamilyMemberRole(input);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Refresh members list
      if (currentFamily) {
        const memberResult = await apiListFamilyMembers(currentFamily.id);
        if (!memberResult.error) {
          setMembers(memberResult.members);
        }
      }

      return result;
    },
    [currentFamily],
  );

  // ----- refreshFamilies -----
  const refreshFamilies = useCallback(async () => {
    if (!orgId) return;

    setLoading(true);
    setError(null);

    const result = await apiListFamilies(orgId);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setFamilies(result.families);
    setCurrentFamily((prev) => {
      if (prev) {
        const stillMember = result.families.some((f) => f.id === prev.id);
        return stillMember ? prev : result.families[0] ?? null;
      }
      return result.families[0] ?? null;
    });

    setLoading(false);
  }, [orgId]);

  // ----- refreshMembers -----
  const refreshMembers = useCallback(async () => {
    if (!currentFamily) return;

    const result = await apiListFamilyMembers(currentFamily.id);

    if (result.error) {
      setError(result.error);
      return;
    }

    setMembers(result.members);
  }, [currentFamily]);

  const value: FamilyContextType = {
    currentFamily,
    families,
    members,
    orgId,
    setOrgId,
    switchFamily,
    createFamily: handleCreateFamily,
    getFamily: handleGetFamily,
    updateFamily: handleUpdateFamily,
    deleteFamily: handleDeleteFamily,
    addFamilyMember: handleAddFamilyMember,
    removeFamilyMember: handleRemoveFamilyMember,
    updateFamilyMemberRole: handleUpdateFamilyMemberRole,
    refreshFamilies,
    refreshMembers,
    loading,
    error,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Access the family context.
 *
 * Must be used within a <FamilyProvider>.
 *
 * @example
 * ```tsx
 * function FamilyList() {
 *   const { families, currentFamily, switchFamily, createFamily } = useFamily();
 *   // ...
 * }
 * ```
 */
export function useFamily(): FamilyContextType {
  const context = useContext(FamilyContext);
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}
