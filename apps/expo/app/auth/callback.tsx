import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@mealme/api';

/**
 * Expo auth callback screen.
 *
 * When Supabase redirects back to the app after an OAuth flow, the
 * deep link `mealme://auth/callback` (or `com.mealme.app://auth/callback`)
 * resolves to this screen. The URL contains `access_token` and
 * `refresh_token` as query parameters, which we use to set the
 * Supabase session.
 *
 * Success → /(main)/home
 * Failure → error message with retry link back to login
 */
export default function AuthCallbackScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      const access_token = params.access_token as string | undefined;
      const refresh_token = params.refresh_token as string | undefined;

      if (!access_token || !refresh_token) {
        setError('Missing authentication tokens in the redirect URL.');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (sessionError) {
        setError(sessionError.message ?? 'Failed to create session.');
        return;
      }

      // Session established — navigate to the main app
      router.replace('/(main)/home');
    }

    handleCallback();
  }, [params, router]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Authentication Failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text
          style={styles.retryLink}
          onPress={() => router.replace('/(auth)/login')}
        >
          Return to login
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#2196F3" />
      <Text style={styles.loadingText}>Signing you in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#d32f2f',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorMessage: {
    color: '#666',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  retryLink: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingText: {
    color: '#666',
    fontSize: 16,
    marginTop: 16,
  },
});
