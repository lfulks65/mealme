import { Stack } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function MainLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      {/* Tab navigator (Home, Families, Organizations) */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Family screens */}
      <Stack.Screen name="families/index" options={{ title: 'Families' }} />
      <Stack.Screen name="families/[id]" options={{ title: 'Family' }} />
      <Stack.Screen name="families/[id]/settings" options={{ title: 'Family Settings' }} />

      {/* Org screens */}
      <Stack.Screen name="orgs/index" options={{ title: 'Organizations' }} />
      <Stack.Screen name="orgs/[id]" options={{ title: 'Organization' }} />
      <Stack.Screen name="orgs/[id]/settings" options={{ title: 'Organization Settings' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
});
