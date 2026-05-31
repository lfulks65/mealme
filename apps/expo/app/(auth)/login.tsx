import { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { LoginScreen as SharedLoginScreen } from '@mealme/ui';

export default function LoginScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { redirect } = useLocalSearchParams<{ redirect?: string }>();

  // Safety net: redirect to target or home if already authenticated
  // (e.g., deep link bypassed root guard)
  useEffect(() => {
    if (isAuthenticated) {
      if (redirect) {
        router.replace(redirect);
      } else {
        router.replace('/(main)/home');
      }
    }
  }, [isAuthenticated, redirect]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <SharedLoginScreen
      onNavigateToSignup={() => {
        router.push('/(auth)/signup');
      }}
      onNavigateToForgotPassword={() => {
        router.push('/(auth)/forgot-password');
      }}
      onLoginSuccess={() => {
        if (redirect) {
          router.replace(redirect);
        } else {
          router.replace('/(main)/home');
        }
      }}
    />
  );
}
