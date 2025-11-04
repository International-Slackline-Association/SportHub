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

  // AWS Amplify does NOT pass environment variables to Lambda at runtime
  // They must be embedded during build using the env config
  // These values are read from Amplify Environment Variables during build
  // and baked into the Next.js server bundle
  env: {
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET,
    COGNITO_REGION: process.env.COGNITO_REGION,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
  },
};

export default nextConfig;
