import { Stack } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function AuthLayout() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  // Auth guard at root level handles redirects for authenticated users.
  // reset-password is an exception: it requires an authenticated session
  // from a deep link, so we allow authenticated users to stay on that screen.
  // The root useAuthGuard skips redirecting away from reset-password when
  // the user is authenticated.

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="reset-password" />
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
