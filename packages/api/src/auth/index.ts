// Supabase client
export { supabase } from './client';

// Auth functions
export {
  signUp,
  signIn,
  signInWithProvider,
  signOut,
  getSession,
  onAuthStateChange,
} from './functions';

export type {
  AuthUser,
  AuthResult,
  AuthStateCallback,
} from './functions';

// Profile functions
export { getProfile, updateProfile } from './profile';
export type { Profile, ProfileUpdate, ProfileResult } from './profile';

// React context & hook
export { AuthProvider, useAuth } from './context';
export type { AuthContextType } from './context';
