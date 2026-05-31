'use client';

import { LoginScreen as SharedLoginScreen } from '@mealme/ui';
import { useAuth } from '@mealme/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/dashboard';
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to target when authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push(redirect);
    }
  }, [isLoading, isAuthenticated, router, redirect]);

  if (isLoading) {
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
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
      onLoginSuccess={() => router.push(redirect)}
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <p>Loading...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
