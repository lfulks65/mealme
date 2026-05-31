import type { SupportedStorage } from '@supabase/supabase-js';

/**
 * Secure storage adapter for Supabase auth tokens.
 * Uses expo-secure-store on React Native (encrypted keychain storage).
 * Falls back to localStorage on web.
 *
 * Dynamic imports for `expo-secure-store` ensure the web bundle never
 * tries to include a native module.
 */
const SecureStorageAdapter: SupportedStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    // Use expo-secure-store on native
    const { getItemAsync } = await import('expo-secure-store');
    try {
      return await getItemAsync(key);
    } catch {
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
    const { setItemAsync } = await import('expo-secure-store');
    await setItemAsync(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
      return;
    }
    const { deleteItemAsync } = await import('expo-secure-store');
    await deleteItemAsync(key);
  },
};

export { SecureStorageAdapter };
