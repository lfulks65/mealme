import { Slot } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@mealme/ui';
import { AuthProvider } from '@mealme/ui';
import { TenantProvider, OrgProvider, FamilyProvider } from '@mealme/api';
import { queryClient } from '../src/lib/queryClient';
import { useAuthGuard } from '../src/hooks/useAuthGuard';

export default function RootLayout() {
  useAuthGuard();
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider queryClient={queryClient}>
        <TenantProvider>
          <OrgProvider>
            <FamilyProvider>
              <Slot />
            </FamilyProvider>
          </OrgProvider>
        </TenantProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
