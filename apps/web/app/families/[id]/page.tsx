'use client';

import { FamilyDetailScreen } from '@mealme/ui';
import { useRouter, useParams } from 'next/navigation';

export default function FamilyDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return (
    <FamilyDetailScreen
      familyId={params.id}
      onSettingsPress={(familyId: string) => {
        router.push(`/families/${familyId}/settings`);
      }}
      onBack={() => router.back()}
    />
  );
}
