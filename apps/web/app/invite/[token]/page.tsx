/**
 * Next.js route: /invite/[token]
 *
 * Renders the shared AcceptInviteScreen from @mealme/ui.
 * Works for both authenticated and unauthenticated users —
 * unauthenticated users are redirected to login with a redirect back.
 */

'use client';

import { AcceptInviteScreen } from '@mealme/ui';
import { useRouter, useParams } from 'next/navigation';

export default function InvitePage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();

  return (
    <AcceptInviteScreen
      inviteToken={params.token}
      onSuccess={(orgId: string) => {
        router.push(`/orgs/${orgId}`);
      }}
      onLoginRequired={() => {
        router.push(`/login?redirect=/invite/${params.token}`);
      }}
    />
  );
}
