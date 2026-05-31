'use client';

import { FamilyPreferencesScreen } from '@mealme/ui';
import { useRouter, useParams } from 'next/navigation';

export default function FamilyPreferencesPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return <FamilyPreferencesScreen familyId={params.id} onBack={() => router.back()} />;
}
