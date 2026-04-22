// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {},
  outputFileTracingIncludes: {
    '/api/pdf-v2/[userDocId]': ['./img/**/*', './fonts/**/*'],
    '/api/pdf-v2/batch': ['./img/**/*', './fonts/**/*'],
  },
};

export default nextConfig;
