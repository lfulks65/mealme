import { Slot } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@mealme/ui';
import { AuthProvider } from '@mealme/ui';
import { TenantProvider, OrgProvider, FamilyProvider, QueryClientProvider } from '@mealme/api';

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider>
        <TenantProvider>
          <OrgProvider>
            <FamilyProvider>
              <QueryClientProvider>
                <Slot />
              </QueryClientProvider>
            </FamilyProvider>
          </OrgProvider>
        </TenantProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
