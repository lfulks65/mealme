'use client';

import { FamilySettingsScreen } from '@mealme/ui';
import { useRouter, useParams } from 'next/navigation';

export default function FamilySettingsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return (
    <FamilySettingsScreen
      familyId={params.id}
      onBack={() => router.back()}
      onFamilyDeleted={() => {
        router.replace('/families');
      }}
    />
  );
}
