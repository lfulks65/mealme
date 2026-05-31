/**
 * @module tenant/context
 * React context for tenant (org) and family selection with persistence.
 *
 * TenantProvider is the central coordination layer for multi-tenant state.
 * It manages the current `tenantId` (org ID) and `familyId`, persists
 * them to localStorage (web) or AsyncStorage (Expo), and ensures that
 * switching orgs automatically clears the family selection.
 *
 * Both OrgProvider and FamilyProvider will integrate with this context
 * to coordinate org ↔ family selection.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import type { TenantHeaders } from './client';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const TENANT_STORAGE_KEY = 'mealme_tenant';

/**
 * Persist tenant/family selection to localStorage (web) or AsyncStorage (Expo).
 * Silently no-ops in environments where storage is unavailable (SSR, private
 * browsing, etc.).
 */
function saveTenantToStorage(tenantId: string | null, familyId: string | null): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify({ tenantId, familyId }));
    }
  } catch {
    // Storage not available (SSR, private browsing, etc.) — ignore.
  }

  // Expo / React Native: try AsyncStorage
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    if (AsyncStorage && typeof AsyncStorage.setItem === 'function') {
      AsyncStorage.setItem(TENANT_STORAGE_KEY, JSON.stringify({ tenantId, familyId })).catch(() => {
        // Async write failed — ignore.
      });
    }
  } catch {
    // @react-native-async-storage/async-storage not installed — not Expo.
  }
}

/**
 * Load tenant/family selection from localStorage (web) or AsyncStorage (Expo).
 * Returns `{ tenantId: null, familyId: null }` when nothing is stored or
 * storage is unavailable.
 */
function loadTenantFromStorage(): Promise<{ tenantId: string | null; familyId: string | null }> {
  // Web: try localStorage synchronously first
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(TENANT_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          return Promise.resolve({
            tenantId: typeof parsed.tenantId === 'string' ? parsed.tenantId : null,
            familyId: typeof parsed.familyId === 'string' ? parsed.familyId : null,
          });
        }
      }
    }
  } catch {
    // localStorage not available — fall through.
  }

  // Expo / React Native: try AsyncStorage
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    if (AsyncStorage && typeof AsyncStorage.getItem === 'function') {
      return AsyncStorage.getItem(TENANT_STORAGE_KEY)
        .then((stored: string | null) => {
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed && typeof parsed === 'object') {
                return {
                  tenantId: typeof parsed.tenantId === 'string' ? parsed.tenantId : null,
                  familyId: typeof parsed.familyId === 'string' ? parsed.familyId : null,
                };
              }
            } catch {
              // Corrupt JSON — return defaults.
            }
          }
          return { tenantId: null, familyId: null };
        })
        .catch(() => ({ tenantId: null, familyId: null }));
    }
  } catch {
    // @react-native-async-storage/async-storage not installed — not Expo.
  }

  return Promise.resolve({ tenantId: null, familyId: null });
}

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

export interface TenantContextType {
  /** Current tenant ID (org ID). null when no org is selected. */
  tenantId: string | null;
  /** Current family ID. null when no family is selected. */
  familyId: string | null;
  /** Set the active tenant (org). Clears familyId when switching orgs. */
  setTenantId: (orgId: string | null) => void;
  /** Set the active family within the current tenant. */
  setFamilyId: (familyId: string | null) => void;
  /** Whether the tenant context is ready (has loaded initial state from storage). */
  ready: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export interface TenantProviderProps {
  children: React.ReactNode;
  /** Optional initial tenant ID (for server-side hydration or testing). */
  initialTenantId?: string;
  /** Optional initial family ID (for server-side hydration or testing). */
  initialFamilyId?: string;
}

/**
 * Provide the tenant context to the component tree.
 *
 * Manages the current `tenantId` (org ID) and `familyId`, persists
 * them to localStorage (web) or AsyncStorage (Expo), and ensures
 * that switching orgs automatically clears the family selection.
 *
 * On mount, the provider restores the saved tenant/family selection
 * from storage. The `ready` flag is `true` once this initial load
 * is complete — important for SSR/hydration to avoid mismatches.
 *
 * If `initialTenantId` / `initialFamilyId` props are provided, they
 * take precedence over stored values (useful for SSR hydration).
 *
 * @example
 * ```tsx
 * <TenantProvider>
 *   <OrgProvider>
 *     <FamilyProvider>
 *       <App />
 *     </FamilyProvider>
 *   </OrgProvider>
 * </TenantProvider>
 * ```
 */
export function TenantProvider({
  children,
  initialTenantId,
  initialFamilyId,
}: TenantProviderProps) {
  const [tenantId, setTenantIdState] = useState<string | null>(initialTenantId ?? null);
  const [familyId, setFamilyIdState] = useState<string | null>(initialFamilyId ?? null);
  const [ready, setReady] = useState(false);
  const initialLoadDone = useRef(false);

  // ----- Restore from storage on mount -----
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    // If initial props were provided (SSR hydration), skip storage restore
    // and just mark as ready.
    if (initialTenantId !== undefined || initialFamilyId !== undefined) {
      setReady(true);
      return;
    }

    let cancelled = false;

    loadTenantFromStorage().then((stored) => {
      if (cancelled) return;

      if (stored.tenantId !== null) {
        setTenantIdState(stored.tenantId);
      }
      if (stored.familyId !== null) {
        setFamilyIdState(stored.familyId);
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- Persist to storage whenever tenant/family changes -----
  useEffect(() => {
    // Only persist after the initial load is complete to avoid
    // overwriting stored values with the default null state.
    if (!ready) return;

    saveTenantToStorage(tenantId, familyId);
  }, [tenantId, familyId, ready]);

  // ----- setTenantId: switch org and clear family -----
  const setTenantId = useCallback((newOrgId: string | null) => {
    setTenantIdState(newOrgId);
    // Families belong to an org — switching orgs invalidates the
    // current family selection.
    setFamilyIdState(null);
  }, []);

  // ----- setFamilyId -----
  const setFamilyId = useCallback((newFamilyId: string | null) => {
    setFamilyIdState(newFamilyId);
  }, []);

  const value: TenantContextType = useMemo(
    () => ({
      tenantId,
      familyId,
      setTenantId,
      setFamilyId,
      ready,
    }),
    [tenantId, familyId, setTenantId, setFamilyId, ready],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Access the tenant context.
 *
 * Must be used within a `<TenantProvider>`.
 *
 * @example
 * ```tsx
 * function TenantSwitcher() {
 *   const { tenantId, familyId, setTenantId, setFamilyId, ready } = useTenant();
 *   if (!ready) return <LoadingSpinner />;
 *   // ...
 * }
 * ```
 */
export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

/**
 * Returns the current tenant headers object suitable for `createTenantClient`.
 *
 * Returns `null` when no tenant (org) is selected.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const headers = useTenantHeaders();
 *   if (!headers) return <p>Select an organisation first.</p>;
 *
 *   const client = createTenantClient(headers);
 *   // ...
 * }
 * ```
 */
export function useTenantHeaders(): TenantHeaders | null {
  const { tenantId, familyId } = useTenant();

  return useMemo(() => {
    if (!tenantId) return null;
    return {
      'x-tenant-id': tenantId,
      ...(familyId ? { 'x-family-id': familyId } : {}),
    };
  }, [tenantId, familyId]);
}
