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
      {
        protocol: 'http',
        hostname: 'images.isa-rankings.org',
      },
      {
        protocol: 'https',
        hostname: 'images.isa-rankings.org',
      }
    ],
  },
};

export default nextConfig;
