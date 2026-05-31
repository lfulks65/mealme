import { FamilyPreferencesScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function FamilyPreferencesRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) return null;

  return <FamilyPreferencesScreen familyId={id} onBack={() => router.back()} />;
}
