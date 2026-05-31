import { OrgDetailScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function OrgDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) return null;

  return (
    <OrgDetailScreen
      orgId={id}
      onSettingsPress={(orgId: string) => {
        router.push(`/orgs/${orgId}/settings`);
      }}
      onBack={() => router.back()}
    />
  );
}
