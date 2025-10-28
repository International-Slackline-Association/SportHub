# AWS Amplify Deployment Guide

Complete guide for deploying SportHub to AWS Amplify, including build configuration, environment variables, and troubleshooting.

## Table of Contents

- [Overview](#overview)
- [Environment Variables](#environment-variables)
  - [Required Variables](#required-variables)
  - [Configuration by Category](#configuration-by-category)
  - [Build-Time vs Runtime](#build-time-vs-runtime)
- [Build Configuration](#build-configuration)
  - [amplify.yml](#amplifyyml)
  - [Build Scripts](#build-scripts)
  - [Build Process Flow](#build-process-flow)
- [Initial Setup](#initial-setup)
- [Common Issues & Troubleshooting](#common-issues--troubleshooting)
- [Console vs File Configuration](#console-vs-file-configuration)
- [Security Best Practices](#security-best-practices)
- [Maintenance](#maintenance)

---

## Overview

SportHub is deployed on AWS Amplify with the following setup:

- **Repository Structure:** Monorepo (app in `sport-hub/` directory)
- **Build Tool:** pnpm
- **Framework:** Next.js 15.3.4 with Turbopack
- **Node Version:** 20 (via nvm)
- **Authentication:** NextAuth v5 with AWS Cognito

**Current Deployment:**
- Branch: `df-dev`
- Domain: `https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com`

---

## Environment Variables

### Required Variables

#### Build-Time Required

These variables are **required for the build to complete** and must be set in Amplify Console → **Environment variables** (NOT Secrets):

```bash
COGNITO_CLIENT_ID=13n3pj9pc57077813tcukvo004
COGNITO_REGION=eu-central-1
COGNITO_USER_POOL_ID=eu-central-1_iGaYGKeyJ
AMPLIFY_MONOREPO_APP_ROOT=sport-hub
```

#### Runtime-Only Required

These variables are **only needed when the server runs** (NOT during build). They can be stored in Amplify Console → **Secrets** (encrypted):

```bash
AUTH_SECRET=<your-secret>              # Generate: openssl rand -base64 32
COGNITO_CLIENT_SECRET=<your-secret>    # Get from AWS Cognito Console
```

#### Optional but Recommended

```bash
AUTH_URL=https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com
```

⚠️ **Important:** Use the base domain only - do NOT include `/api/auth/callback/cognito`

---

### Configuration by Category

#### ✅ Keep in Environment Variables (plain text)

| Variable | Value | Purpose |
|----------|-------|---------|
| `COGNITO_CLIENT_ID` | `13n3pj9pc57077813tcukvo004` | Cognito app client ID |
| `COGNITO_REGION` | `eu-central-1` | AWS region for Cognito |
| `COGNITO_USER_POOL_ID` | `eu-central-1_iGaYGKeyJ` | Cognito user pool |
| `AMPLIFY_MONOREPO_APP_ROOT` | `sport-hub` | Monorepo app location |
| `AUTH_URL` | `https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com` | Base URL for auth |

#### ✅ Keep in Secrets (encrypted)

| Variable | Purpose |
|----------|---------|
| `AUTH_SECRET` | NextAuth JWT encryption key |
| `COGNITO_CLIENT_SECRET` | Cognito client authentication |

#### ❌ Remove (Unnecessary)

| Variable | Why Unnecessary |
|----------|-----------------|
| `AWS_ACCESS_KEY_ID` | Amplify provides via IAM role |
| `AWS_SECRET_ACCESS_KEY` | Amplify provides via IAM role |
| `AWS_REGION` | Duplicate of `COGNITO_REGION` |
| `AMPLIFY_DIFF_DEPLOY` | Amplify auto-managed |
| `DYNAMODB_LOCAL` | Only for local development |

---

### Build-Time vs Runtime

Understanding when variables are accessed:

#### Build-Time (`next build`)
- Runs on Amplify build servers
- Compiles Next.js application
- Generates static assets
- **Needs:** Configuration values (IDs, regions, URLs)
- **Does NOT need:** Secrets (they're only used at runtime)

**Required at build time:**
- `COGNITO_CLIENT_ID` ✅
- `COGNITO_REGION` ✅
- `COGNITO_USER_POOL_ID` ✅

**NOT required at build time:**
- `COGNITO_CLIENT_SECRET` ❌ (runtime only)
- `AUTH_SECRET` ❌ (runtime only)

#### Runtime (Server Running)
- Handles user requests
- Executes authentication
- Signs/verifies JWTs
- Makes API calls
- **Needs:** All variables including secrets

**Required at runtime:**
- All build-time variables
- `COGNITO_CLIENT_SECRET` ✅
- `AUTH_SECRET` ✅

#### Why This Matters

**Secrets in Amplify:**
- Variables marked as "Secret" are **encrypted and only available at runtime**
- Build process **cannot access** Amplify Secrets
- This is intentional for security

**Therefore:**
- Build-time variables → Regular Environment Variables
- Runtime-only secrets → Amplify Secrets (encrypted)
- The `check-env.js` script validates this correctly

---

## Build Configuration

### amplify.yml

Location: `/sport-hub/amplify.yml`

This file defines the build process and is version-controlled in Git:

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - nvm use 20
            - node -v
            # Check environment variables before build
            - node scripts/check-env.js
            - chmod +x scripts/setup_environ.sh
            - ./scripts/setup_environ.sh
        build:
          commands:
            - chmod +x scripts/build_sporthub.sh
            - ./scripts/build_sporthub.sh
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - .next/cache/**/*
          - node_modules/**/*
      environment:
        variables:
          NODE_VERSION: 22.15.0
    appRoot: sport-hub
```

**Key Features:**
- Uses Node 20 via nvm
- Validates environment variables before build
- Custom build scripts for Discord notifications
- Caches dependencies and build artifacts
- Monorepo configuration with `appRoot: sport-hub`

---

### Build Scripts

All build scripts are located in `/sport-hub/scripts/`:

#### `scripts/check-env.js`

Validates environment variables before build starts:

**Categories:**
- **Build-Time Required:** Fails build if missing
- **Runtime-Only:** Info only, won't fail build
- **Optional:** Shows status
- **Unnecessary:** Warns if present with explanation

**Example Output:**
```
🔍 Environment Variables Check:
================================
Build-Time Required Variables:
✅ COGNITO_CLIENT_ID: 13n3pj9pc57077813tcukvo004
✅ COGNITO_REGION: eu-central-1
✅ COGNITO_USER_POOL_ID: eu-central-1_iGaYGKeyJ

Runtime-Only Variables (not required for build):
ℹ️  COGNITO_CLIENT_SECRET: NOT SET (OK - only needed at runtime)
ℹ️  AUTH_SECRET: NOT SET (OK - only needed at runtime)

Optional Variables:
✅ AUTH_URL: https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com

⚠️  Unnecessary Variables (optional - can be removed):
⚠️  AWS_ACCESS_KEY_ID: ***SET***
   └─ Amplify provides via IAM role

================================
✅ All required build-time environment variables are present
```

#### `scripts/setup_environ.sh`

Installs dependencies:
```bash
#!/bin/bash
echo ">>> Starting install"
node -v  # sanity check
npm install -g pnpm@10.12.4  # Install pnpm
pnpm install                 # Install dependencies
```

#### `scripts/build_sporthub.sh`

Runs build with error handling and Discord notifications:
- Detects branch via `$AWS_BRANCH`
- Runs `pnpm run build`
- Sends Discord webhook on success/failure
- Returns appropriate exit code

**Discord Notifications:**
- ✅ Success: `Build succeeded on branch: df-dev`
- ❌ Failure: `Build failed on branch: df-dev (exit code - 1)`
- Only sends when `$AWS_BRANCH` is set (Amplify environment)

---

### Build Process Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. preBuild Phase                                      │
├─────────────────────────────────────────────────────────┤
│  • nvm use 20              → Switch to Node 20          │
│  • node -v                 → Verify Node version        │
│  • node scripts/check-env  → Validate env vars          │
│  • ./scripts/setup_environ → Install pnpm & deps        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  2. Build Phase                                         │
├─────────────────────────────────────────────────────────┤
│  • ./scripts/build_sporthub → Run build with Discord    │
│    - Detects branch (AWS_BRANCH)                       │
│    - Runs pnpm run build                               │
│    - Sends Discord notification                        │
│    - Returns exit code                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  3. Artifacts                                           │
├─────────────────────────────────────────────────────────┤
│  • Collects .next/ directory                           │
│  • Deploys to Amplify hosting                          │
└─────────────────────────────────────────────────────────┘
```

**Caching:**
- `node_modules/**/*` - Speeds up dependency installation
- `.next/cache/**/*` - Speeds up subsequent builds

**Cache Invalidation:**
If needed: Amplify Console → Build settings → Clear cache → Redeploy

---

## Initial Setup

### 1. Configure AWS Amplify App

1. **Create Amplify App** (if not exists):
   - Go to AWS Amplify Console
   - Connect to your Git repository
   - Select branch: `df-dev`

2. **Set Build Settings:**
   - Amplify will auto-detect `amplify.yml` from the repository
   - Alternatively, configure in Console (but version-controlled file is recommended)

### 2. Configure Environment Variables

In **Amplify Console → Environment variables**:

**Add Environment Variables:**
```
COGNITO_CLIENT_ID       = 13n3pj9pc57077813tcukvo004
COGNITO_REGION          = eu-central-1
COGNITO_USER_POOL_ID    = eu-central-1_iGaYGKeyJ
AMPLIFY_MONOREPO_APP_ROOT = sport-hub
AUTH_URL                = https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com
```

**Add Secrets:**
```
AUTH_SECRET             = <generate with: openssl rand -base64 32>
COGNITO_CLIENT_SECRET   = <get from AWS Cognito Console>
```

**To get COGNITO_CLIENT_SECRET:**
1. Go to AWS Cognito Console
2. Navigate to User Pools → `eu-central-1_iGaYGKeyJ`
3. App integration → App clients → Select your client
4. Click "Show client secret"
5. Copy the value

**Mark as Secret:**
- Check the "Secret" box for `AUTH_SECRET` and `COGNITO_CLIENT_SECRET`

### 3. Configure AWS Cognito Callback URLs

In **AWS Cognito Console**:

1. Go to User Pools → `eu-central-1_iGaYGKeyJ`
2. App integration → App clients → Select your client
3. Edit "Hosted UI settings"

**Add Callback URLs:**
```
http://localhost:3000/api/auth/callback/cognito
https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com/api/auth/callback/cognito
```

**Add Sign-out URLs:**
```
http://localhost:3000
https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com
```

**OAuth Settings:**
- Grant types: ✅ Authorization code grant
- Scopes: ✅ `openid`, ✅ `email`, ✅ `profile` (optional)

### 4. Deploy

1. Push code to `df-dev` branch (if not already)
2. Amplify will automatically build and deploy
3. Check build logs for validation output
4. Test deployment at your Amplify URL

---

## Common Issues & Troubleshooting

### Build Failing: Missing Environment Variables

**Error:**
```
❌ COGNITO_CLIENT_SECRET: MISSING
❌ AUTH_SECRET: MISSING
```

**Cause:**
- Variables marked as "Secret" in Amplify are NOT available at build time
- The build is incorrectly requiring runtime-only secrets

**Solution:**
✅ **This is now fixed!** Runtime secrets are optional for build.

If build still fails:
1. Verify `COGNITO_CLIENT_ID`, `COGNITO_REGION`, `COGNITO_USER_POOL_ID` are set
2. Check build logs for which variable is actually missing
3. Clear build cache and redeploy

---

### Error: redirect_uri_mismatch

**Symptoms:**
- Cognito error about invalid redirect URI
- Can't complete authentication

**Cause:**
Callback URL not configured in Cognito

**Solution:**
1. Go to AWS Cognito → Your App Client → Hosted UI
2. Add callback URL: `https://your-domain.amplifyapp.com/api/auth/callback/cognito`
3. Ensure it matches exactly (no trailing slash, correct protocol)

---

### Redirecting to localhost:3000 in Production

**Symptoms:**
- Clicking "Sign In" redirects to `localhost:3000`
- Works locally but not on Amplify

**Cause:**
`AUTH_URL` is set incorrectly or includes callback path

**Solution:**
1. Check `AUTH_URL` in Amplify environment variables
2. Should be: `https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com`
3. Should NOT include: `/api/auth/callback/cognito`
4. Clear cache and redeploy

---

### Build Script Not Executable

**Error:**
```
Permission denied: ./scripts/build_sporthub.sh
```

**Solution:**
```bash
chmod +x scripts/setup_environ.sh
chmod +x scripts/build_sporthub.sh
git add scripts/
git commit -m "Make build scripts executable"
git push
```

---

### Discord Notifications Not Working

**Check:**
1. Webhook URL is correct in `scripts/build_sporthub.sh` (line 38)
2. Webhook hasn't been deleted or regenerated
3. Build is running in Amplify (has `$AWS_BRANCH` set)

**Note:** Notifications only send in Amplify, not locally

---

### Configuration Error on Sign In

**Symptoms:**
- Redirected to `/auth/error?error=Configuration`
- "Server Configuration Error" message

**Causes:**
- Missing runtime environment variables
- Wrong `AUTH_URL` format
- Secrets not accessible at runtime

**Solution:**
1. Verify ALL required variables are set (including secrets)
2. Check `AUTH_URL` is base domain only
3. Ensure secrets are in Amplify Secrets (not just env vars)
4. Check application logs for specific error

---

### amplify.yml Being Ignored

**Symptoms:**
- Changes to `amplify.yml` don't take effect
- Build uses different configuration

**Causes:**
1. Console has "Override build settings" enabled
2. YAML syntax errors
3. File not in correct location

**Solution:**
1. Amplify Console → Build settings → Edit
2. Disable "Amplify override build settings"
3. Validate YAML syntax (use online validator)
4. Ensure file is at `/sport-hub/amplify.yml`

---

### Wrong Node Version

**Symptoms:**
- Build errors related to Node version incompatibility

**Current Config:**
- `nvm use 20` - Switches to Node 20 (takes precedence)
- `NODE_VERSION: 22.15.0` - Environment variable (not used)

**To change to Node 22:**
```yaml
- nvm use 22
```

---

### Build Warnings: !Failed to set up process.env.secrets

**What it means:**
- Amplify had trouble loading some environment variables
- Only problematic variables fail, others may still load

**Solutions:**
1. Check all required variables are set in Amplify Console
2. Don't mark non-secret variables as secrets
3. Check build logs for which specific variables failed
4. Clear cache and redeploy

---

## Console vs File Configuration

### Which Takes Precedence?

AWS Amplify handles configuration priority:

1. **If `amplify.yml` exists:** Amplify uses it by default
2. **Console override:** Can override file if "Override build settings" is ON
3. **Recommendation:** Use `amplify.yml` for version control

### Benefits of amplify.yml

✅ **Version controlled** - Changes tracked in Git
✅ **Team visible** - Everyone can see configuration
✅ **Easier updates** - Just commit changes
✅ **Consistent** - Same config across branches
✅ **Documented** - Configuration lives with code

### Using amplify.yml (Recommended)

1. Keep `amplify.yml` in repository
2. In Amplify Console → Build settings
3. Ensure "Amplify override build settings" is **OFF**
4. Amplify will use the file from your repo

### Console Override (Alternative)

If you need to override:
1. Enable "Amplify override build settings" in Console
2. Console configuration takes precedence
3. Keep `amplify.yml` as fallback

---

## Security Best Practices

### ✅ Current Implementation

- **Secrets in Amplify Secrets** - Encrypted at rest
- **No secrets in code** - All in environment variables
- **Server-side only** - Secrets never exposed to client
- **HTTP-only cookies** - Session tokens not accessible via JS
- **CSRF protection** - Enabled by default in NextAuth
- **Build validation** - Environment check before build
- **Discord notifications** - Monitor build status

### 🔒 Recommended Enhancements

**For Production:**

1. **Use AWS Secrets Manager:**
   - Store secrets in AWS Secrets Manager
   - Reference in Amplify with `${secretsmanager:secret-name}`
   - Automatic rotation support

2. **Separate Environments:**
   - Different secrets for dev/staging/prod
   - Different Cognito user pools per environment
   - Different AWS accounts for isolation

3. **Regular Rotation:**
   - Rotate `AUTH_SECRET` quarterly
   - Rotate `COGNITO_CLIENT_SECRET` after team changes
   - Monitor rotation in CloudTrail

4. **Access Monitoring:**
   - Enable CloudTrail for Amplify
   - Monitor secret access patterns
   - Alert on unusual activity

5. **Least Privilege:**
   - Restrict Amplify IAM role permissions
   - Only grant necessary permissions
   - Regular permission audits

### ❌ Security Anti-Patterns to Avoid

- Don't commit `.env` files to Git
- Don't use same secrets across environments
- Don't hardcode secrets in `amplify.yml`
- Don't expose secrets in client-side code
- Don't share secrets in chat/email

---

## Maintenance

### Updating Configuration

#### Update amplify.yml
1. Edit `/sport-hub/amplify.yml`
2. Commit and push to Git
3. Amplify uses new config on next build

#### Update Build Scripts
1. Edit files in `/sport-hub/scripts/` directory
2. Ensure executable: `chmod +x scripts/<script>.sh`
3. Commit and push
4. Next build uses updated scripts

#### Update Environment Variables
1. Amplify Console → Environment variables
2. Add/modify variables
3. Clear cache
4. Redeploy

### Monitoring

**Build Logs:**
- Amplify Console → App → Branch → Build logs
- Check for environment validation output
- Look for errors or warnings

**Application Logs:**
- Amplify Console → Monitoring → Logs
- Check runtime errors
- Monitor authentication issues

**Discord Notifications:**
- Automatic on build success/failure
- Webhook configured in `scripts/build_sporthub.sh`
- Only sends in Amplify environment

### Regular Tasks

**Weekly:**
- Review build logs for warnings
- Check for unnecessary environment variables
- Monitor authentication errors

**Monthly:**
- Review and clean up old branches in Amplify
- Check build cache effectiveness
- Review Discord notification history

**Quarterly:**
- Rotate `AUTH_SECRET`
- Review and update dependencies
- Security audit of environment variables

### Debugging Tips

**Local Testing:**
```bash
cd sport-hub

# Test environment check
node scripts/check-env.js

# Test setup script
./scripts/setup_environ.sh

# Test build
./scripts/build_sporthub.sh
```

**Check Build Configuration:**
```bash
# Verify amplify.yml syntax
cat amplify.yml | grep -v "^#"

# Check script permissions
ls -la scripts/
```

**Verify Environment:**
```bash
# In Amplify build logs, look for:
🔍 Environment Variables Check:
================================
```

---

## File Reference

### Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `amplify.yml` | `/sport-hub/` | Build configuration (version controlled) |
| `next.config.ts` | `/sport-hub/` | Next.js configuration |
| `.env.local` | `/sport-hub/` | Local development only (not committed) |

### Build Scripts

| File | Location | Purpose |
|------|----------|---------|
| `check-env.js` | `/sport-hub/scripts/` | Validate environment variables |
| `setup_environ.sh` | `/sport-hub/scripts/` | Install dependencies |
| `build_sporthub.sh` | `/sport-hub/scripts/` | Run build with notifications |

### Documentation

| File | Purpose |
|------|---------|
| `AMPLIFY_DEPLOYMENT.md` | This file - Complete deployment guide |
| `AUTH_SETUP.md` | Authentication setup and configuration |

---

## Quick Reference

### Your Deployment

**Branch:** `df-dev`
**Domain:** `https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com`
**Cognito Pool:** `eu-central-1_iGaYGKeyJ`
**Region:** `eu-central-1`

### Required Variables (Build-Time)
```
COGNITO_CLIENT_ID       = 13n3pj9pc57077813tcukvo004
COGNITO_REGION          = eu-central-1
COGNITO_USER_POOL_ID    = eu-central-1_iGaYGKeyJ
AMPLIFY_MONOREPO_APP_ROOT = sport-hub
```

### Required Secrets (Runtime)
```
AUTH_SECRET             = <generate: openssl rand -base64 32>
COGNITO_CLIENT_SECRET   = <from Cognito Console>
```

### Optional but Recommended
```
AUTH_URL = https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com
```

### Cognito URLs (Configure in Cognito Console)
```
Callback:  https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com/api/auth/callback/cognito
Sign-out:  https://df-dev.d2c5lq1ojcfw0k.amplifyapp.com
```

### Common Commands
```bash
# Generate AUTH_SECRET
openssl rand -base64 32

# Test environment validation
node scripts/check-env.js

# Make scripts executable
chmod +x scripts/*.sh

# Clear Next.js cache locally
rm -rf .next
```

---

## Related Documentation

- [AUTH_SETUP.md](./AUTH_SETUP.md) - Complete authentication setup guide
- [AWS Amplify Docs](https://docs.aws.amazon.com/amplify/) - Official Amplify documentation
- [NextAuth.js Docs](https://authjs.dev/) - NextAuth v5 documentation
- [AWS Cognito Docs](https://docs.aws.amazon.com/cognito/) - Cognito user pools

---

## Support

**For build issues:**
1. Check this troubleshooting section
2. Review Amplify build logs
3. Test scripts locally
4. Check Discord notifications for error details

**For authentication issues:**
1. See [AUTH_SETUP.md](./AUTH_SETUP.md)
2. Verify Cognito configuration
3. Check environment variables
4. Review application logs

**For configuration questions:**
1. Review this document
2. Check `amplify.yml` comments
3. Validate environment variables with `check-env.js`
