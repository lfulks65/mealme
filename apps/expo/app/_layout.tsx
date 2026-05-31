import { Slot } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@mealme/ui';
import { AuthProvider } from '@mealme/ui';
import { OrgProvider, FamilyProvider } from '@mealme/api';
import { queryClient } from '../src/lib/queryClient';

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider queryClient={queryClient}>
        <OrgProvider>
          <FamilyProvider>
            <Slot />
          </FamilyProvider>
        </OrgProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
