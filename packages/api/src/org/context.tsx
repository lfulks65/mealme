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
import {
  inviteMember as apiInviteMember,
  acceptInvite as apiAcceptInvite,
  removeMember as apiRemoveMember,
  updateMemberRole as apiUpdateMemberRole,
  listMembers as apiListMembers,
  listInvites as apiListInvites,
  listPendingInvitesForUser as apiListPendingInvitesForUser,
} from './members';
import type {
  OrgWithRole,
  CreateOrgInput,
  UpdateOrgInput,
  OrgResult,
  OrgListResult,
  OrgDeleteResult,
  OrgMember,
  InviteRow,
  InviteMemberInput,
  UpdateMemberRoleInput,
  OrgMemberResult,
  InviteResult,
  InviteListResult,
  AcceptInviteResult,
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

  // ----- Member management -----

  /** Members of the current org. */
  members: OrgMember[];
  /** Pending invites for the current org. */
  invites: InviteRow[];
  /** Whether the member list is loading. */
  membersLoading: boolean;

  /** Invite a member by email (admin+ only). */
  inviteMember: (input: InviteMemberInput) => Promise<InviteResult>;
  /** Accept a pending invite. */
  acceptInvite: (inviteId: string) => Promise<AcceptInviteResult>;
  /** Remove a member from the current org (owner cannot be removed). */
  removeMember: (userId: string) => Promise<OrgMemberResult>;
  /** Update a member's role (admin+ only). */
  updateMemberRole: (input: UpdateMemberRoleInput) => Promise<OrgMemberResult>;
  /** Refresh the member list for the current org. */
  refreshMembers: () => Promise<void>;
  /** Refresh the invite list for the current org. */
  refreshInvites: () => Promise<void>;
  /** List pending invites for the current user (across all orgs). */
  listPendingInvitesForUser: () => Promise<InviteListResult>;
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

  // ----- Member management state -----
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<InviteRow[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

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

  // ----- Load members & invites when currentOrg changes -----
  useEffect(() => {
    if (!currentOrg) {
      setMembers([]);
      setInvites([]);
      return;
    }

    let cancelled = false;

    async function loadMembersAndInvites() {
      setMembersLoading(true);

      // currentOrg is guaranteed non-null by the early return above,
      // but TypeScript can't track that through closures.
      const orgId = currentOrg!.id;

      const [membersResult, invitesResult] = await Promise.all([
        apiListMembers(orgId),
        apiListInvites(orgId),
      ]);

      if (cancelled) return;

      if (membersResult.error) {
        setError(membersResult.error);
      } else {
        setMembers(membersResult.members);
      }

      if (invitesResult.error) {
        setError(invitesResult.error);
      } else {
        setInvites(invitesResult.invites);
      }

      setMembersLoading(false);
    }

    loadMembersAndInvites();

    return () => {
      cancelled = true;
    };
  }, [currentOrg]);

  // ----- inviteMember -----
  const handleInviteMember = useCallback(
    async (input: InviteMemberInput): Promise<InviteResult> => {
      setError(null);

      const result = await apiInviteMember(input);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Add the new invite to the local list
      if (result.invite) {
        setInvites((prev) => [result.invite!, ...prev]);
      }

      return result;
    },
    [],
  );

  // ----- acceptInvite -----
  const handleAcceptInvite = useCallback(
    async (inviteId: string): Promise<AcceptInviteResult> => {
      setError(null);

      const result = await apiAcceptInvite(inviteId);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Refresh orgs and members since membership changed
      await refreshOrgs();

      return result;
    },
    [refreshOrgs],
  );

  // ----- removeMember -----
  const handleRemoveMember = useCallback(
    async (userId: string): Promise<OrgMemberResult> => {
      if (!currentOrg) {
        return { success: false, error: 'No organization selected' };
      }

      setError(null);

      const result = await apiRemoveMember(currentOrg.id, userId);

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Remove the member from the local list
      setMembers((prev) => prev.filter((m) => m.userId !== userId));

      return result;
    },
    [currentOrg],
  );

  // ----- updateMemberRole -----
  const handleUpdateMemberRole = useCallback(
    async (input: UpdateMemberRoleInput): Promise<OrgMemberResult> => {
      if (!currentOrg) {
        return { success: false, error: 'No organization selected' };
      }

      setError(null);

      const result = await apiUpdateMemberRole({
        ...input,
        orgId: currentOrg.id,
      });

      if (result.error) {
        setError(result.error);
        return result;
      }

      // Update the member's role in the local list
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === input.userId ? { ...m, role: input.role } : m,
        ),
      );

      return result;
    },
    [currentOrg],
  );

  // ----- refreshMembers -----
  const refreshMembers = useCallback(async () => {
    if (!currentOrg) {
      setMembers([]);
      return;
    }

    setMembersLoading(true);

    const result = await apiListMembers(currentOrg.id);

    if (result.error) {
      setError(result.error);
    } else {
      setMembers(result.members);
    }

    setMembersLoading(false);
  }, [currentOrg]);

  // ----- refreshInvites -----
  const refreshInvites = useCallback(async () => {
    if (!currentOrg) {
      setInvites([]);
      return;
    }

    const result = await apiListInvites(currentOrg.id);

    if (result.error) {
      setError(result.error);
    } else {
      setInvites(result.invites);
    }
  }, [currentOrg]);

  // ----- listPendingInvitesForUser -----
  const handleListPendingInvitesForUser = useCallback(
    async (): Promise<InviteListResult> => {
      return apiListPendingInvitesForUser();
    },
    [],
  );

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
    // Member management
    members,
    invites,
    membersLoading,
    inviteMember: handleInviteMember,
    acceptInvite: handleAcceptInvite,
    removeMember: handleRemoveMember,
    updateMemberRole: handleUpdateMemberRole,
    refreshMembers,
    refreshInvites,
    listPendingInvitesForUser: handleListPendingInvitesForUser,
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
