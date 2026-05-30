'use client';

import { LoginScreen as SharedLoginScreen } from '@mealme/ui';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <SharedLoginScreen
      onNavigateToSignup={() => router.push('/signup')}
      onNavigateToForgotPassword={() => router.push('/forgot-password')}
    />
  );
}
