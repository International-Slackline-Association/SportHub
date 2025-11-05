import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length || 0,
    nodeEnv: process.env.NODE_ENV,
    hasCognitoClientId: !!process.env.COGNITO_CLIENT_ID,
    hasCognitoClientSecret: !!process.env.COGNITO_CLIENT_SECRET,
    hasCognitoPoolId: !!process.env.COGNITO_USER_POOL_ID,
    cognitoRegion: process.env.COGNITO_REGION,
  });
}
