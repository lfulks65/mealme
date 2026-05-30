/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@mealme/ui',
    '@gluestack-ui/themed',
    '@gluestack-ui/config',
    '@gluestack-style/react',
    'react-native-safe-area-context',
    'react-native-svg',
    'react-native-web',
  ],
  reactStrictMode: true,
};

module.exports = nextConfig;
