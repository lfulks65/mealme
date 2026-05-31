const { nativewind } = require('nativewind/tailwind');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    // Include workspace UI package for NativeWind class detection
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [nativewind()],
  theme: {
    extend: {},
  },
  plugins: [],
};
