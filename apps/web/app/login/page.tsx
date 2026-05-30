'use client';

import { LoginScreen as SharedLoginScreen } from '@mealme/ui';
import { useAuth } from '@mealme/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
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
    <SharedLoginScreen
      onNavigateToSignup={() => router.push('/signup')}
      onNavigateToForgotPassword={() => router.push('/forgot-password')}
      onLoginSuccess={() => router.push('/dashboard')}
    />
  );
}
