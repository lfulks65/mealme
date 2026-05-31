import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { isSessionExpired, forceSignOut } from '@mealme/api';

/**
 * Hook that guards routes based on auth state and session expiry.
 * Call this in the root layout to auto-redirect unauthenticated users
 * to the login screen and redirect authenticated users away from auth
 * screens.
 *
 * Session expiry detection: if the session is expired, we force sign-out
 * which clears the auth state and triggers the redirect to login.
 */
export function useAuthGuard() {
  const { isAuthenticated, isLoading, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    // Check for expired session — force sign out which triggers redirect
    if (isAuthenticated && session && isSessionExpired(session)) {
      forceSignOut();
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login, preserving the intended route
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      // Note: reset-password is an exception — it requires an authenticated
      // session from the deep link. The auth group layout should allow
      // authenticated users to stay on reset-password.
      const isResetPassword = segments[1] === 'reset-password';
      if (!isResetPassword) {
        router.replace('/(main)/home');
      }
    }
  }, [isAuthenticated, isLoading, segments, session]);
}
