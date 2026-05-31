import { OrgSettingsScreen } from '@mealme/ui';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function OrgSettingsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) return null;

  return (
    <OrgSettingsScreen
      orgId={id}
      onBack={() => router.back()}
      onOrgDeleted={() => {
        router.replace('/orgs/index');
      }}
    />
  );
}
