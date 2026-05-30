'use client';

import React from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { config } from '@mealme/ui';
import { AuthProvider } from '@mealme/ui';
import { OrgProvider, FamilyProvider } from '@mealme/api';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GluestackUIProvider config={config}>
      <AuthProvider>
        <OrgProvider>
          <FamilyProvider>
            {children}
          </FamilyProvider>
        </OrgProvider>
      </AuthProvider>
    </GluestackUIProvider>
  );
}
