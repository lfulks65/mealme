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

  // Auth guard is handled at root level — just render the stack
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="home" options={{ title: 'MealMe', headerShown: false }} />
      <Stack.Screen name="families/index" options={{ title: 'Families' }} />
      <Stack.Screen name="families/[id]" options={{ title: 'Family' }} />
      <Stack.Screen name="families/[id]/settings" options={{ title: 'Family Settings' }} />
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
