'use client';

import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config, AuthProvider } from '@mealme/ui';
import { TenantProvider, OrgProvider, FamilyProvider } from '@mealme/api';
import { getQueryClient } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider config={config}>
        <AuthProvider queryClient={queryClient}>
          <TenantProvider>
            <OrgProvider>
              <FamilyProvider>{children}</FamilyProvider>
            </OrgProvider>
          </TenantProvider>
        </AuthProvider>
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
