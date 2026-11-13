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
      },
      {
        protocol: 'https',
        hostname: 'www.figma.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'slacklinesport.org',
      },
    ],
  },
  // Fonts and images the certificate PDFs read from disk at runtime
  outputFileTracingIncludes: {
    '/api/certificates/[kind]/[id]': ['./src/lib/certificate-assets/**'],
  },
  // The user management page used to live at /test_SSR
  async redirects() {
    return [{ source: '/test_SSR', destination: '/admin/users-management', permanent: true }];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

export default nextConfig;
