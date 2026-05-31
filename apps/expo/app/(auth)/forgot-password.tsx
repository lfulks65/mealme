import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@mealme/ui';
import { ForgotPasswordScreen as SharedForgotPasswordScreen } from '@mealme/ui';

export default function ForgotPasswordScreen() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Safety net: redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(main)/home');
    }
  }, [isAuthenticated]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <SharedForgotPasswordScreen
      onNavigateToLogin={() => {
        router.push('/(auth)/login');
      }}
    />
  );
}
