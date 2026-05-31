/**
 * @module DashboardClient
 * Client component for the dashboard page.
 *
 * Handles authentication state, redirects, and interactive UI.
 * Extracted from the original page.tsx to allow the page to be
 * a Server Component with generateMetadata.
 */

'use client';

import { useAuth, TenantSwitcher } from '@mealme/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function DashboardClient() {
  const { user, isAuthenticated, isLoading, signOut } = useAuth();
  const router = useRouter();

  // Protected route: redirect to login if unauthenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
      }}
    >
      <div style={{ padding: '0 24px', alignItems: 'center', gap: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Welcome to MealMe</h1>
        {user && <p style={{ fontSize: 16, color: '#6B7280' }}>Hello, {user.name}!</p>}
        <div style={{ width: '100%', maxWidth: 400 }}>
          <TenantSwitcher
            style={{}}
            onCreateOrgPress={() => router.push('/orgs')}
            onCreateFamilyPress={() => router.push('/families')}
          />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/orgs')}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: '#7C3AED',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Organizations
          </button>
          <button
            onClick={() => router.push('/families')}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: '#2563EB',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Families
          </button>
          <button
            onClick={() => router.push('/meal-plan')}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: '#059669',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Meal Plan
          </button>
          <button
            onClick={() => router.push('/recipes')}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#FFFFFF',
              backgroundColor: '#D97706',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Recipes
          </button>
          <button
            onClick={signOut}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              backgroundColor: '#F3F4F6',
              borderRadius: 6,
              border: '1px solid #D1D5DB',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1,
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
