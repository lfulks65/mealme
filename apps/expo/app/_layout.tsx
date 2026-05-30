import { Slot } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@mealme/ui';
import { AuthProvider } from '@mealme/ui';
import { OrgProvider, FamilyProvider } from '@mealme/api';

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider>
        <OrgProvider>
          <FamilyProvider>
            <Slot />
          </FamilyProvider>
        </OrgProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
