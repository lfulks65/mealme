/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore ESLint errors during build — lint is handled separately via `pnpm lint`
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@mealme/shared',
    '@mealme/ui',
    '@mealme/api',
    '@mealme/heb',
    'nativewind',
    // React Native ecosystem packages that ship untranspiled JSX/TSX source
    '@expo/html-elements',
    // @gluestack-ui sub-packages (ship untranspiled .jsx)
    '@gluestack-ui/accordion',
    '@gluestack-ui/actionsheet',
    '@gluestack-ui/alert-dialog',
    '@gluestack-ui/alert',
    '@gluestack-ui/avatar',
    '@gluestack-ui/button',
    '@gluestack-ui/checkbox',
    '@gluestack-ui/config',
    '@gluestack-ui/divider',
    '@gluestack-ui/fab',
    '@gluestack-ui/form-control',
    '@gluestack-ui/hooks',
    '@gluestack-ui/icon',
    '@gluestack-ui/image',
    '@gluestack-ui/input',
    '@gluestack-ui/link',
    '@gluestack-ui/menu',
    '@gluestack-ui/modal',
    '@gluestack-ui/nativewind-utils',
    '@gluestack-ui/overlay',
    '@gluestack-ui/popover',
    '@gluestack-ui/pressable',
    '@gluestack-ui/progress',
    '@gluestack-ui/provider',
    '@gluestack-ui/radio',
    '@gluestack-ui/react-native-aria',
    '@gluestack-ui/select',
    '@gluestack-ui/slider',
    '@gluestack-ui/spinner',
    '@gluestack-ui/switch',
    '@gluestack-ui/tabs',
    '@gluestack-ui/textarea',
    '@gluestack-ui/themed',
    '@gluestack-ui/toast',
    '@gluestack-ui/tooltip',
    '@gluestack-ui/transitions',
    '@gluestack-ui/utils',
    // @gluestack-style packages
    '@gluestack-style/animation-resolver',
    '@gluestack-style/legend-motion-animation-driver',
    '@gluestack-style/react',
    // Other RN ecosystem
    '@legendapp/motion',
    'react-native-safe-area-context',
    'react-native-svg',
    'react-native-web',
    'react-native-reanimated',
  ],
  webpack: (config, { isServer }) => {
    const path = require('path');

    // Alias react-native -> react-native-web for Next.js web builds.
    // react-native ships Flow-typed source that SWC cannot parse;
    // react-native-web provides a browser-compatible alternative.
    const emptyModule = path.resolve(__dirname, 'src/lib/empty-module.js');

    // Define __DEV__ global used by React Native packages
    const defines = config.plugins.find(
      (p) => p && p.constructor && p.constructor.name === 'DefinePlugin',
    );
    if (defines) {
      const existing = defines.definitions || {};
      defines.definitions = {
        ...existing,
        '__DEV__': JSON.stringify(process.env.NODE_ENV !== 'production'),
      };
    }

    config.resolve.alias = {
      ...config.resolve.alias,
      // Top-level import alias (e.g. import { View } from 'react-native')
      'react-native$': 'react-native-web',
      // Deep imports into react-native internals are native-only and have
      // no web equivalent — redirect to an empty module shim.
      'react-native/Libraries/Utilities/codegenNativeComponent': emptyModule,
      'react-native/Libraries/Renderer/shims/ReactNativeTypes': emptyModule,
      'react-native/Libraries/ReactNative/requireNativeComponent': emptyModule,
      '@mealme/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@mealme/api': path.resolve(__dirname, '../../packages/api/src'),
    };

    return config;
  },
};

module.exports = nextConfig;
