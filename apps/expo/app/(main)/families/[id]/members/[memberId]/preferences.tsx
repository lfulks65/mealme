import { MemberPreferencesScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function MemberPreferencesRoute() {
  const { id, memberId } = useLocalSearchParams<{ id: string; memberId: string }>();
  const router = useRouter();

  if (!id || !memberId) return null;

  return <MemberPreferencesScreen memberId={memberId} onBack={() => router.back()} />;
}
