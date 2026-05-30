/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mealme/shared', '@mealme/ui', '@mealme/api', '@mealme/heb'],
};

module.exports = nextConfig;
