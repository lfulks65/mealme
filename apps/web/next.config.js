/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mealme/shared', '@mealme/ui', '@mealme/api', '@mealme/heb'],
  webpack: (config, { isServer }) => {
    // Ensure pnpm workspace packages can resolve each other
    // This fixes the "Module not found" errors with pnpm's strict node_modules
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@mealme/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@mealme/api': path.resolve(__dirname, '../../packages/api/src'),
    };
    return config;
  },
};

module.exports = nextConfig;
