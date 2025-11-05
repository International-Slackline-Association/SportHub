// This file runs when the Next.js server initializes
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('========================================')
    console.log('🚀 Next.js Server Starting...')
    console.log('========================================')
    console.log('Environment Check:')
    console.log('  NODE_ENV:', process.env.NODE_ENV)
    console.log('  NEXT_RUNTIME:', process.env.NEXT_RUNTIME)
    console.log('  COGNITO_CLIENT_ID:', process.env.COGNITO_CLIENT_ID ? '✅ SET' : '❌ MISSING')
    console.log('  COGNITO_CLIENT_SECRET:', process.env.COGNITO_CLIENT_SECRET ? '✅ SET' : '❌ MISSING')
    console.log('  COGNITO_REGION:', process.env.COGNITO_REGION ? '✅ SET' : '❌ MISSING')
    console.log('  COGNITO_USER_POOL_ID:', process.env.COGNITO_USER_POOL_ID ? '✅ SET' : '❌ MISSING')
    console.log('  AUTH_SECRET:', process.env.AUTH_SECRET ? '✅ SET' : '❌ MISSING')
    console.log('  AUTH_URL:', process.env.AUTH_URL || '❌ NOT SET')
    console.log('========================================')

    // Log all environment variables (keys only, not values)
    const allEnvKeys = Object.keys(process.env).sort()
    console.log(`Total environment variables: ${allEnvKeys.length}`)
    console.log('Environment variable keys:', allEnvKeys.slice(0, 20).join(', '), '...')
    console.log('========================================')
  }
}
