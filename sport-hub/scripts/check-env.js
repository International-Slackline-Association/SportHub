#!/usr/bin/env node

console.log('🔍 Environment Variables Check:');
console.log('================================');

const requiredVars = [
  'COGNITO_CLIENT_ID',
  'COGNITO_CLIENT_SECRET',
  'COGNITO_REGION',
  'COGNITO_USER_POOL_ID',
  'AUTH_SECRET'
];

const optionalVars = [
  'AUTH_URL',          // NextAuth v5 preferred
  'NEXTAUTH_URL',      // Backwards compatibility
  'NEXTAUTH_SECRET'    // Alternative to AUTH_SECRET
];

let allPresent = true;

console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  const displayValue = varName.includes('SECRET')
    ? (value ? '***PRESENT***' : 'MISSING')
    : (value || 'MISSING');

  console.log(`${isPresent ? '✅' : '❌'} ${varName}: ${displayValue}`);

  if (!isPresent) {
    allPresent = false;
  }
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  const displayValue = varName.includes('SECRET')
    ? (value ? '***PRESENT***' : 'MISSING')
    : (value || 'MISSING');

  console.log(`${isPresent ? '✅' : 'ℹ️ '} ${varName}: ${displayValue}`);
});

console.log('================================');

// Special check for URL variables
const authUrl = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
if (authUrl) {
  console.log(`🌐 Auth URL being used: ${authUrl}`);
  if (authUrl.includes('localhost')) {
    console.warn('⚠️  WARNING: Using localhost URL - update for production!');
  }
} else {
  console.log('🌐 Auth URL: Using auto-detection (trustHost: true)');
}

console.log('================================');

if (!allPresent) {
  console.error('❌ Some required environment variables are missing!');
  process.exit(1);
} else {
  console.log('✅ All required environment variables are present');
}
