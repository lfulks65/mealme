'use client';

import { OrgDetailScreen } from '@mealme/ui';
import { useRouter, useParams } from 'next/navigation';

export default function OrgDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return (
    <OrgDetailScreen
      orgId={params.id}
      onSettingsPress={(orgId: string) => {
        router.push(`/orgs/${orgId}/settings`);
      }}
      onBack={() => router.back()}
    />
  );
}
