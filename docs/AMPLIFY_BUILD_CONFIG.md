# AWS Amplify Build Configuration

This document explains the Amplify build configuration and how to manage it.

## Configuration Files

The build process uses the following files:

### 1. `amplify.yml` (Project Configuration)

Location: `/sport-hub/amplify.yml`

This file defines the build configuration that can be committed to Git. When present, Amplify will use this file **by default**.

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

### 2. Build Scripts

All build scripts are located in `/sport-hub/scripts/` directory:

#### `scripts/setup_environ.sh`

Handles dependency installation:
- Installs pnpm globally (version 10.12.4)
- Installs project dependencies

#### `scripts/build_sporthub.sh`

Handles the build process with:
- Error handling and status capture
- Discord webhook notifications on success/failure
- Branch detection (uses `$AWS_BRANCH` in Amplify)
- Runs `pnpm run build`

#### `scripts/check-env.js`

Validates environment variables before build:
- Checks all required variables are present
- Warns if `AUTH_URL` points to localhost
- Shows which variables are loaded
- Fails build if required variables are missing

## Amplify Console vs amplify.yml

### Which Takes Precedence?

AWS Amplify handles build configuration priority like this:

1. **If `amplify.yml` exists in the repo:** Amplify uses it by default
2. **Amplify Console configuration:** Can override the file (if explicitly configured)
3. **Both present:** Console takes precedence if "Override build settings" is enabled

### Current Setup

✅ **Recommended:** Keep `amplify.yml` in the repository

**Benefits:**
- Version controlled with your code
- Changes are tracked in Git
- Consistent across branches
- Easier to review and update
- Team members can see the configuration

### Should You Remove the Console Configuration?

**Answer: No, but you can simplify it.**

**Option 1: Use amplify.yml Only (Recommended)**

1. Keep the `amplify.yml` file in your repository
2. In Amplify Console → App settings → Build settings:
   - Ensure "Amplify override build settings" is **OFF**
   - This makes Amplify use `amplify.yml` from the repo

**Option 2: Override with Console**

1. Keep `amplify.yml` as a fallback
2. In Amplify Console → Build settings:
   - Enable "Amplify override build settings"
   - The console configuration will override `amplify.yml`

**Recommendation:** Use Option 1 (amplify.yml only) for better version control and team collaboration.

## Build Process Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. preBuild Phase                                      │
├─────────────────────────────────────────────────────────┤
│  • nvm use 20              → Switch to Node 20          │
│  • node -v                 → Verify Node version        │
│  • node scripts/check-env  → Validate env vars          │
│  • ./setup_environ.sh      → Install pnpm & deps        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  2. Build Phase                                         │
├─────────────────────────────────────────────────────────┤
│  • ./build_sporthub.sh     → Run build with Discord     │
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

## Environment Variables Check

The `check-env.js` script validates:

**Required:**
- `COGNITO_CLIENT_ID`
- `COGNITO_CLIENT_SECRET`
- `COGNITO_REGION`
- `COGNITO_USER_POOL_ID`
- `AUTH_SECRET`

**Optional:**
- `AUTH_URL` (warns if localhost)
- `NEXTAUTH_URL` (backwards compatibility)
- `NEXTAUTH_SECRET` (backwards compatibility)

**Example Output:**

```
🔍 Environment Variables Check:
================================
Required Variables:
✅ COGNITO_CLIENT_ID: 13n3pj9pc57077813tcukvo004
✅ COGNITO_CLIENT_SECRET: ***PRESENT***
✅ COGNITO_REGION: eu-central-1
✅ COGNITO_USER_POOL_ID: eu-central-1_iGaYGKeyJ
✅ AUTH_SECRET: ***PRESENT***

Optional Variables:
✅ AUTH_URL: https://main.d1a2b3c4d5e6f.amplifyapp.com
✅ NEXTAUTH_URL: https://main.d1a2b3c4d5e6f.amplifyapp.com

🌐 Auth URL being used: https://main.d1a2b3c4d5e6f.amplifyapp.com
================================
✅ All required environment variables are present
```

## Discord Notifications

The `build_sporthub.sh` script sends notifications to Discord:

**On Success:**
```
✅ Build succeeded on branch: main
```

**On Failure:**
```
❌ Build failed on branch: main (exit code - 1)
```

**Webhook URL:** Configured in `scripts/build_sporthub.sh` line 38

⚠️ **Note:** Only sends notifications when `$AWS_BRANCH` is set (i.e., running in Amplify, not locally)

## Caching

The build caches the following to speed up subsequent builds:

```yaml
cache:
  paths:
    - .next/cache/**/*
    - node_modules/**/*
```

**Cache Invalidation:**

If you need to clear the cache:
1. Go to Amplify Console → App settings → Build settings
2. Scroll to "Build cache"
3. Click "Clear cache"
4. Redeploy

## Updating the Configuration

### To Update amplify.yml

1. Edit `/sport-hub/amplify.yml`
2. Commit and push to Git
3. Amplify will use the new configuration on the next build

### To Update Build Scripts

1. Edit the script in `/sport-hub/scripts/` directory (`setup_environ.sh` or `build_sporthub.sh`)
2. Ensure it's marked as executable: `chmod +x scripts/<script>.sh`
3. Commit and push to Git
4. Next build will use the updated script

### To Update Environment Variable Check

1. Edit `/sport-hub/scripts/check-env.js`
2. Add/remove variables as needed
3. Commit and push to Git

## Troubleshooting

### Build failing at check-env.js?

**Cause:** Missing environment variables

**Solution:**
1. Go to Amplify Console → Environment variables
2. Add the missing variables shown in the error
3. Redeploy

### Build script not executable?

**Error:** `Permission denied`

**Solution:**
```bash
chmod +x scripts/setup_environ.sh
chmod +x scripts/build_sporthub.sh
git add scripts/setup_environ.sh scripts/build_sporthub.sh
git commit -m "Make build scripts executable"
git push
```

### amplify.yml being ignored?

**Possible causes:**
1. Console has "Override build settings" enabled
2. `amplify.yml` has syntax errors
3. `amplify.yml` is not in the `appRoot` directory

**Solution:**
1. Check Amplify Console → Build settings → Edit
2. Disable "Amplify override build settings" if enabled
3. Validate YAML syntax
4. Ensure file is at `/sport-hub/amplify.yml`

### Wrong Node version?

The config uses:
- `nvm use 20` (switches to Node 20)
- `NODE_VERSION: 22.15.0` (environment variable)

**Note:** `nvm use 20` takes precedence. If you want to use Node 22, change to:
```yaml
- nvm use 22
```

### Discord notifications not working?

**Check:**
1. Webhook URL is correct in `scripts/build_sporthub.sh`
2. Webhook has not been deleted or regenerated
3. `$AWS_BRANCH` is set (only sends in Amplify, not locally)

## Local Testing

You can test the build scripts locally:

```bash
cd sport-hub

# Test environment check
node scripts/check-env.js

# Test setup (requires .env.local)
./scripts/setup_environ.sh

# Test build
./scripts/build_sporthub.sh
```

**Note:** Discord webhook will NOT fire locally (no `$AWS_BRANCH`)

## Best Practices

✅ **Do:**
- Keep `amplify.yml` in version control
- Use environment variables for secrets
- Test scripts locally before pushing
- Document any custom build steps
- Use caching for faster builds

❌ **Don't:**
- Hardcode secrets in `amplify.yml`
- Put sensitive data in build scripts
- Commit `.env.local` to Git
- Make scripts dependent on local paths
- Skip environment variable validation

## Files Reference

| File                              | Purpose                                 |
|-----------------------------------|-----------------------------------------|
| `amplify.yml`                     | Build configuration                     |
| `scripts/setup_environ.sh`        | Install dependencies                    |
| `scripts/build_sporthub.sh`       | Run build with notifications            |
| `scripts/check-env.js`            | Validate environment variables          |
| `package.json`                    | Defines `pnpm run build` script         |
| `next.config.ts`                  | Next.js configuration                   |

## Related Documentation

- [AUTH_SETUP.md](./AUTH_SETUP.md) - Authentication configuration
- [AWS Amplify Build Settings](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html)
- [Amplify YML Schema](https://docs.aws.amazon.com/amplify/latest/userguide/build-settings.html#build-spec-yaml-syntax)
