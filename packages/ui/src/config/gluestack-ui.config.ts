import { createConfig } from '@gluestack-ui/themed';
import { config as baseConfig } from '@gluestack-ui/config';

// Extend the base config with custom MealMe theming
export const config = createConfig({
  ...baseConfig,
} as any);

export type AppConfig = typeof config;
