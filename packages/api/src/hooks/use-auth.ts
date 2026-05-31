/**
 * @module hooks/use-auth
 * React Query hooks for auth domain functions.
 *
 * Re-exports auth hooks from the auth module and the legacy
 * useAuth context hook.
 */

// Re-export useAuth from the auth context (legacy hook)
export { useAuth } from '../auth/context';
export type { AuthContextType } from '../auth/context';

// Re-export React Query auth hooks from the auth module
export {
  authKeys,
  useSession,
  useCurrentUser,
  useSignUp,
  useSignIn,
  useSignInWithProvider,
  useSignOut,
  useResetPassword,
} from '../auth/authQueries';
