'use client';

import { ForgotPasswordScreen as SharedForgotPasswordScreen } from '@mealme/ui';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <SharedForgotPasswordScreen
      onNavigateToLogin={() => router.push('/login')}
    />
  );
}
