import { OrgListScreen } from '@mealme/ui';
import { useRouter } from 'expo-router';

export default function OrgsScreen() {
  const router = useRouter();
  return (
    <OrgListScreen
      onOrgPress={(orgId: string) => {
        router.push(`/orgs/${orgId}`);
      }}
    />
  );
}
