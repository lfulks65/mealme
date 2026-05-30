import { Slot } from 'expo-router';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@mealme/ui';
import { AuthProvider } from '@mealme/ui';

export default function RootLayout() {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider>
        <Slot />
      </AuthProvider>
    </GluestackUIProvider>
  );
}
