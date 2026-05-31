// Supabase client
export { supabase } from './client';

// Auth functions
export {
  signUp,
  signIn,
  signInWithProvider,
  signOut,
  resetPasswordForEmail,
  getSession,
  onAuthStateChange,
} from './functions';

export type { AuthUser, AuthResult, AuthStateCallback } from './functions';

// Profile functions
export { getProfile, updateProfile } from './profile';
export type { Profile, ProfileUpdate, ProfileResult } from './profile';

// React context & hook
export { AuthProvider, useAuth } from './context';
export type { AuthContextType } from './context';

// Auth state listener
export { startAuthListener } from './authListener';

// Auth Query Provider
export { AuthQueryProvider } from './AuthQueryProvider';

// Secure storage adapter
export { SecureStorageAdapter } from './secureStorage';

// Session management utilities
export { isSessionExpired, refreshSession, forceSignOut } from './sessionManager';

// Session expiry hook
export { useSessionExpiry } from './context';

// React Query auth hooks — also available via ../hooks barrel
export {
  authKeys,
  useSession,
  useCurrentUser,
  useSignUp,
  useSignIn,
  useSignInWithProvider,
  useSignOut,
  useResetPassword,
} from './authQueries';
