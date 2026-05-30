import React from 'react';
import { FamilySettingsScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function FamilySettingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <FamilySettingsScreen
      familyId={id}
      onBack={() => router.back()}
      onFamilyDeleted={() => {
        router.replace('/families/index');
      }}
    />
  );
}
