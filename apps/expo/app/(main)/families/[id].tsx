import React from 'react';
import { FamilyDetailScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <FamilyDetailScreen
      familyId={id}
      onSettingsPress={(familyId: string) => {
        router.push(`/families/${familyId}/settings`);
      }}
      onBack={() => router.back()}
    />
  );
}
