import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { LoginScreen as SharedLoginScreen } from '@mealme/ui';

export default function LoginScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Safety net: redirect to home if already authenticated
  // (e.g., deep link bypassed root guard)
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(main)/home');
    }
  }, [isAuthenticated]);

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
    />
  );
}
