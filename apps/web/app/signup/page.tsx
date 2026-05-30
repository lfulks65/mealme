'use client';

import { SignupScreen as SharedSignupScreen } from '@mealme/ui';
import { useAuth } from '@mealme/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard when authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <SharedSignupScreen
      onNavigateToLogin={() => router.push('/login')}
      onSignupSuccess={() => router.push('/dashboard')}
    />
  );
}
