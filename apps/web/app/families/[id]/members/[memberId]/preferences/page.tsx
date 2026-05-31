'use client';

import { MemberPreferencesScreen } from '@mealme/ui';
import { useRouter, useParams } from 'next/navigation';

export default function MemberPreferencesPage() {
  const router = useRouter();
  const params = useParams<{ id: string; memberId: string }>();

  return <MemberPreferencesScreen memberId={params.memberId} onBack={() => router.back()} />;
}
