// next.config.ts
import type { NextConfig } from 'next';
import withPWA from '@ducanh2912/next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  allowedDevOrigins: ['192.168.*.*'],
  outputFileTracingIncludes: {
    '/api/pdf-v2/[userDocId]': ['./img/**/*', './fonts/**/*'],
    '/api/pdf-v2/batch': ['./img/**/*', './fonts/**/*'],
  },
};

const isDev = process.env.NODE_ENV === 'development';

export default isDev
  ? nextConfig
  : withPWA({ dest: 'public', cacheOnFrontEndNav: true, aggressiveFrontEndNavCaching: true, reloadOnOnline: true })(nextConfig);
