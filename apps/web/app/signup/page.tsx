'use client';

import { SignupScreen as SharedSignupScreen } from '@mealme/ui';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  return (
    <SharedSignupScreen
      onNavigateToLogin={() => router.push('/login')}
    />
  );
}
