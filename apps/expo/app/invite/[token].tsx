/**
 * Expo route: /invite/[token]
 *
 * Renders the shared AcceptInviteScreen from @mealme/ui.
 * Works for both authenticated and unauthenticated users —
 * unauthenticated users are prompted to log in first.
 */

import { useRouter, useLocalSearchParams } from 'expo-router';
import { AcceptInviteScreen } from '@mealme/ui';

export default function InviteRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();

  if (!token) return null;

  return (
    <AcceptInviteScreen
      inviteToken={token}
      onSuccess={(orgId: string) => {
        router.replace(`/(main)/orgs/${orgId}`);
      }}
      onLoginRequired={() => {
        // Navigate to login with a redirect back to this invite screen
        router.push(`/(auth)/login?redirect=/invite/${token}`);
      }}
    />
  );
}
