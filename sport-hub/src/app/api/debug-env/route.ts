import { NextResponse } from 'next/server'

// This endpoint helps debug environment variable issues
// Remove or protect this in production!
export async function GET() {
  const envStatus = {
    COGNITO_CLIENT_ID: !!process.env.COGNITO_CLIENT_ID,
    COGNITO_CLIENT_SECRET: !!process.env.COGNITO_CLIENT_SECRET,
    COGNITO_REGION: !!process.env.COGNITO_REGION,
    COGNITO_USER_POOL_ID: !!process.env.COGNITO_USER_POOL_ID,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL || null,
    NODE_ENV: process.env.NODE_ENV,
  }

  const envValues = {
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID || 'MISSING',
    COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET ? '***SET***' : 'MISSING',
    COGNITO_REGION: process.env.COGNITO_REGION || 'MISSING',
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID || 'MISSING',
    AUTH_SECRET: process.env.AUTH_SECRET ? '***SET***' : 'MISSING',
    AUTH_URL: process.env.AUTH_URL || 'NOT SET',
  }

  return NextResponse.json({
    status: envStatus,
    values: envValues,
    allPresent: Object.values(envStatus).every(v => v === true),
  })
}
