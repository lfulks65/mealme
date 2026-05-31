import { FamilyDetailScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function FamilyDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) return null;

  return (
    <FamilyDetailScreen
      familyId={id}
      onSettingsPress={(familyId: string) => {
        router.push(`/families/${familyId}/settings`);
      }}
      onPreferencesPress={(familyId: string) => {
        router.push(`/families/${familyId}/preferences`);
      }}
      onBack={() => router.back()}
    />
  );
}
