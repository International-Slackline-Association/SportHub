import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,

  // Add image domains for Cognito user images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },

  // Enable instrumentation for server startup logging
  // @ts-ignore - instrumentationHook is valid but TypeScript types may be outdated
  experimental: {
    instrumentationHook: true,
  } as any,
};

export default nextConfig;
