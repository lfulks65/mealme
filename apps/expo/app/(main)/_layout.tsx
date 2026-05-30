import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function MainLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Protected route: redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="home"
        options={{ title: 'MealMe', headerShown: false }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
