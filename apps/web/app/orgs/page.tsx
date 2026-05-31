'use client';

import { OrgListScreen } from '@mealme/ui';
import { useRouter } from 'next/navigation';

export default function OrgsPage() {
  const router = useRouter();

  return (
    <OrgListScreen
      onOrgPress={(orgId: string) => {
        router.push(`/orgs/${orgId}`);
      }}
    />
  );
}
