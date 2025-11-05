#!/usr/bin/env node

console.log('🔍 Environment Variables Check:');
console.log('================================');

// Build-time required variables (needed during `next build`)
const requiredBuildVars = [
  'COGNITO_CLIENT_ID',
  'COGNITO_REGION',
  'COGNITO_USER_POOL_ID',
];

// Runtime-only variables (only needed when server runs, NOT during build)
const runtimeOnlyVars = [
  'COGNITO_CLIENT_SECRET',  // Only used at runtime for OAuth
  'AUTH_SECRET',            // Only used at runtime for JWT signing
];

const optionalVars = [
  'AUTH_URL',  // NextAuth v5 base URL (runtime)
];

const amplifyVars = [
  'AMPLIFY_MONOREPO_APP_ROOT',  // Amplify monorepo config
  'AWS_BRANCH',                  // Amplify branch (auto-set)
  'AWS_APP_ID',                  // Amplify app ID (auto-set)
];

// Unnecessary variables - Amplify provides these or they're not needed
const unnecessaryVars = [
  { name: 'AWS_ACCESS_KEY_ID', reason: 'Amplify provides via IAM role' },
  { name: 'AWS_SECRET_ACCESS_KEY', reason: 'Amplify provides via IAM role' },
  { name: 'AWS_REGION', reason: 'Duplicate of COGNITO_REGION' },
  { name: 'AMPLIFY_DIFF_DEPLOY', reason: 'Amplify auto-managed' },
  { name: 'DYNAMODB_LOCAL', reason: 'Only for local development' },
];

// Deprecated variables (NextAuth v4 naming, replaced in v5)
const deprecatedVars = [
  { name: 'NEXTAUTH_URL', replacement: 'AUTH_URL' },
  { name: 'NEXTAUTH_SECRET', replacement: 'AUTH_SECRET' },
];

let allBuildVarsPresent = true;

console.log('Build-Time Required Variables:');
requiredBuildVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  const displayValue = value || 'MISSING';

  console.log(`${isPresent ? '✅' : '❌'} ${varName}: ${displayValue}`);

  if (!isPresent) {
    allBuildVarsPresent = false;
  }
});

console.log('\nRuntime-Only Variables (not required for build):');
runtimeOnlyVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  const displayValue = varName.includes('SECRET')
    ? (value ? '***PRESENT***' : 'NOT SET (OK - only needed at runtime)')
    : (value || 'NOT SET');

  console.log(`${isPresent ? '✅' : 'ℹ️ '} ${varName}: ${displayValue}`);
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  const displayValue = value || 'NOT SET';

  console.log(`${isPresent ? '✅' : 'ℹ️ '} ${varName}: ${displayValue}`);
});

console.log('\nAmplify-Specific Variables:');
amplifyVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  const displayValue = value || 'NOT SET';
  console.log(`${isPresent ? '✅' : 'ℹ️ '} ${varName}: ${displayValue}`);
});

// Check for deprecated variables
const deprecatedPresent = deprecatedVars.filter(v => process.env[v.name]);
if (deprecatedPresent.length > 0) {
  console.log('\n⚠️  Deprecated Variables (use NextAuth v5 naming):');
  deprecatedPresent.forEach(v => {
    console.log(`⚠️  ${v.name}: ${process.env[v.name]}`);
    console.log(`   └─ Replace with: ${v.replacement}`);
  });
}

// Check for unnecessary variables
const unnecessaryPresent = unnecessaryVars.filter(v => process.env[v.name]);
if (unnecessaryPresent.length > 0) {
  console.log('\n⚠️  Unnecessary Variables (optional - can be removed):');
  unnecessaryPresent.forEach(v => {
    const value = v.name.includes('SECRET') || v.name.includes('KEY')
      ? '***SET***'
      : (process.env[v.name] || '');
    console.log(`⚠️  ${v.name}: ${value}`);
    console.log(`   └─ ${v.reason}`);
  });
}

console.log('================================');

// Special check for URL variables
const authUrl = process.env.AUTH_URL;
if (authUrl) {
  console.log(`🌐 Auth URL: ${authUrl}`);

  // Check if URL incorrectly includes callback path
  if (authUrl.includes('/api/auth/callback')) {
    console.error('❌ ERROR: AUTH_URL should NOT include callback path!');
    console.error(`   Current: ${authUrl}`);
    console.error(`   Should be: ${authUrl.split('/api/auth/callback')[0]}`);
    allBuildVarsPresent = false;
  }

  if (authUrl.includes('localhost')) {
    console.warn('⚠️  WARNING: Using localhost URL - update for production!');
  }
} else {
  console.log('🌐 Auth URL: Not set (will use auto-detection via trustHost)');
}

// Check monorepo config
if (process.env.AMPLIFY_MONOREPO_APP_ROOT) {
  console.log(`📁 Monorepo app root: ${process.env.AMPLIFY_MONOREPO_APP_ROOT}`);
} else if (process.env.AWS_BRANCH) {
  console.warn('⚠️  Running in Amplify but AMPLIFY_MONOREPO_APP_ROOT not set');
}

console.log('================================');

if (!allBuildVarsPresent) {
  console.error('❌ Some required build-time environment variables are missing!');
  console.error('\n💡 Note: Runtime secrets (AUTH_SECRET, COGNITO_CLIENT_SECRET) are NOT needed during build.');
  console.error('   They only need to be available when the server runs.');
  process.exit(1);
} else {
  console.log('✅ All required build-time environment variables are present');
  console.log('\n💡 Note: Runtime secrets will be validated when the server starts.');
  
  if (unnecessaryPresent.length > 0 || deprecatedPresent.length > 0) {
    console.log('\n💡 Tip: Consider cleaning up unnecessary and deprecated variables.');
  }
}
