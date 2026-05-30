'use client';

import { FamilyListScreen } from '@mealme/ui';
import { useOrg } from '@mealme/api';
import { useRouter } from 'next/navigation';

export default function FamiliesPage() {
  const router = useRouter();
  const { currentOrg } = useOrg();

  return (
    <FamilyListScreen
      orgId={currentOrg?.id ?? ''}
      onFamilyPress={(familyId: string) => {
        router.push(`/families/${familyId}`);
      }}
    />
  );
}
