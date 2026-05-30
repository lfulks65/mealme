import React from 'react';
import { FamilyListScreen } from '@mealme/ui';
import { useRouter } from 'expo-router';
import { useOrg } from '@mealme/api';

export default function FamiliesScreen() {
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
