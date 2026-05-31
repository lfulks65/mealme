'use client';

import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@mealme/ui';
import { AuthProvider } from '@mealme/ui';
import { TenantProvider, OrgProvider, FamilyProvider, QueryClientProvider } from '@mealme/api';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider>
        <TenantProvider>
          <OrgProvider>
            <FamilyProvider>
              <QueryClientProvider>{children}</QueryClientProvider>
            </FamilyProvider>
          </OrgProvider>
        </TenantProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
