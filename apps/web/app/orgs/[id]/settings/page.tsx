'use client';

import { OrgSettingsScreen } from '@mealme/ui';
import { useRouter, useParams } from 'next/navigation';

export default function OrgSettingsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return (
    <OrgSettingsScreen
      orgId={params.id}
      onBack={() => router.back()}
      onOrgDeleted={() => {
        router.replace('/orgs');
      }}
    />
  );
}
