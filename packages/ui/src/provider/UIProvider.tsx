/**
 * UIProvider — wraps the app with gluestack-ui v2 + NativeWind
 *
 * Usage:
 *   import { UIProvider } from '@mealme/ui';
 *   <UIProvider>{children}</UIProvider>
 */
import { type ReactNode } from 'react';
import { GluestackUIProvider } from '@gluestack-ui/themed';
import { gluestackConfig } from '../gluestack.config';

export interface UIProviderProps {
  children: ReactNode;
  /** Optional theme mode; defaults to 'light' */
  mode?: 'light' | 'dark';
}

export function UIProvider({ children, mode = 'light' }: UIProviderProps) {
  return (
    <GluestackUIProvider config={gluestackConfig} colorMode={mode}>
      {children}
    </GluestackUIProvider>
  );
}

export default UIProvider;
