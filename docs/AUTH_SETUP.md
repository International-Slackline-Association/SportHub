# AWS Cognito OIDC Authentication Setup

This application uses AWS Cognito with the OIDC protocol for authentication via NextAuth.js v5 (beta).

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [AWS Cognito Configuration](#aws-cognito-configuration)
- [Deployment](#deployment)
  - [Local Development](#local-development)
  - [AWS Amplify Production](#aws-amplify-production)
- [File Structure](#file-structure)
- [Usage](#usage)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

---

## Quick Start

### 1. Configure Environment Variables

Create a `.env.local` file in the `sport-hub` directory:

```bash
# AWS Cognito Authentication (OIDC)
COGNITO_CLIENT_ID=13n3pj9pc57077813tcukvo004
COGNITO_CLIENT_SECRET=<your-client-secret-here>
COGNITO_USER_POOL_ID=eu-central-1_iGaYGKeyJ
COGNITO_REGION=eu-central-1

# NextAuth Configuration (v5)
AUTH_SECRET=<generated-secret>
# For local development:
AUTH_URL=http://localhost:3000
# For backwards compatibility:
NEXTAUTH_URL=http://localhost:3000
```

**Required Actions:**
1. Replace `<your-client-secret-here>` with your actual Cognito Client Secret
2. Generate `AUTH_SECRET` using: `openssl rand -base64 32`

### 2. Install and Run

```bash
cd sport-hub
pnpm install
pnpm dev
```

### 3. Test Authentication

Navigate to `http://localhost:3000` and click "Sign In"

---

## Environment Variables

### NextAuth v5 Changes

NextAuth v5 uses different environment variable names than v4:

| Old (v4)          | New (v5)      | Notes                              |
|-------------------|---------------|------------------------------------|
| `NEXTAUTH_URL`    | `AUTH_URL`    | **Preferred in v5** - Base URL     |
| `NEXTAUTH_SECRET` | `AUTH_SECRET` | **Required** - JWT encryption key  |

Both old and new names are supported for backwards compatibility.

### Required Variables

| Variable                  | Description                          | Example                                      |
|---------------------------|--------------------------------------|----------------------------------------------|
| `COGNITO_CLIENT_ID`       | Cognito App Client ID                | `13n3pj9pc57077813tcukvo004`                |
| `COGNITO_CLIENT_SECRET`   | Cognito App Client Secret            | `<secret-value>`                            |
| `COGNITO_USER_POOL_ID`    | Cognito User Pool ID                 | `eu-central-1_iGaYGKeyJ`                    |
| `COGNITO_REGION`          | AWS Region                           | `eu-central-1`                              |
| `AUTH_SECRET`             | Secret for JWT encryption            | Generate with `openssl rand -base64 32`     |
| `AUTH_URL`                | Application base URL                 | `http://localhost:3000` or production URL   |

### Optional Variables

| Variable          | Description                          | Notes                        |
|-------------------|--------------------------------------|------------------------------|
| `NEXTAUTH_URL`    | Legacy base URL variable             | Use `AUTH_URL` instead       |
| `NEXTAUTH_SECRET` | Legacy secret variable               | Use `AUTH_SECRET` instead    |

---

## AWS Cognito Configuration

### Current Setup

Your Cognito User Pool is configured as:
- **User Pool ID:** `eu-central-1_iGaYGKeyJ`
- **Client ID:** `13n3pj9pc57077813tcukvo004`
- **Region:** `eu-central-1`
- **Domain:** `https://auth.slacklineinternational.org`

### Required Cognito Settings

In the AWS Cognito Console, configure the following:

#### 1. Callback URLs

Add these to your App Client settings under **Hosted UI**:

**For Development:**
```
http://localhost:3000/api/auth/callback/cognito
```

**For Production (AWS Amplify):**
```
https://your-amplify-domain.amplifyapp.com/api/auth/callback/cognito
```

#### 2. Sign Out URLs

**For Development:**
```
http://localhost:3000
```

**For Production (AWS Amplify):**
```
https://your-amplify-domain.amplifyapp.com
```

#### 3. OAuth 2.0 Grant Types

- ✅ Authorization code grant
- ✅ Implicit grant (optional)

#### 4. OAuth Scopes

- ✅ `openid` (required)
- ✅ `email` (required)
- ✅ `profile` (optional)

#### 5. Identity Providers

- ✅ Cognito User Pool

### How to Update Cognito Settings

1. Go to **AWS Cognito Console** → **User Pools** → `eu-central-1_iGaYGKeyJ`
2. Click **App integration** → **App clients** → Select your client
3. Click **Edit** under **Hosted UI settings**
4. Add your callback and sign-out URLs
5. Save changes

---

## Deployment

### Local Development

1. **Set up environment variables:**

   Create `.env.local`:
   ```bash
   COGNITO_CLIENT_ID=13n3pj9pc57077813tcukvo004
   COGNITO_CLIENT_SECRET=<your-secret>
   COGNITO_USER_POOL_ID=eu-central-1_iGaYGKeyJ
   COGNITO_REGION=eu-central-1
   AUTH_SECRET=<generated-secret>
   AUTH_URL=http://localhost:3000
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start development server:**
   ```bash
   pnpm dev
   ```

4. **Test authentication:**
   - Navigate to `http://localhost:3000`
   - Click "Sign In"
   - Sign in with Cognito credentials

### AWS Amplify Production

> **📘 For complete Amplify deployment guide, see [AMPLIFY_DEPLOYMENT.md](./AMPLIFY_DEPLOYMENT.md)**
>
> This includes:
> - Complete environment variable configuration
> - Build configuration and scripts
> - Troubleshooting guide
> - Security best practices

#### Quick Setup

For detailed step-by-step instructions, see [AMPLIFY_DEPLOYMENT.md](./AMPLIFY_DEPLOYMENT.md#initial-setup).

#### Step 1: Configure Environment Variables in Amplify

1. Go to **AWS Amplify Console** → Your App
2. Click **Environment variables** (under App settings)
3. Click **Manage variables**
4. Add the following variables:

**Required Variables:**
```
COGNITO_CLIENT_ID=13n3pj9pc57077813tcukvo004
COGNITO_CLIENT_SECRET=<your-secret>
COGNITO_REGION=eu-central-1
COGNITO_USER_POOL_ID=eu-central-1_iGaYGKeyJ
AUTH_SECRET=<your-auth-secret>
```

**Important - Set AUTH_URL to your Amplify domain:**
```
AUTH_URL=https://main.d1a2b3c4d5e6f.amplifyapp.com
```

Replace with your actual Amplify domain! You can find it in the Amplify Console under your app.

**For backwards compatibility, also set:**
```
NEXTAUTH_URL=https://main.d1a2b3c4d5e6f.amplifyapp.com
```

⚠️ **Critical:** `AUTH_URL` must be your actual Amplify domain, NOT `localhost:3000`!

#### Step 2: Mark Secrets

Check the **"Secret"** checkbox for:
- `COGNITO_CLIENT_SECRET`
- `AUTH_SECRET`

This encrypts them and hides their values in the console.

#### Step 3: Update Cognito Callback URLs

In AWS Cognito Console:

1. Go to: **Amazon Cognito** → **User Pools** → `eu-central-1_iGaYGKeyJ`
2. Click: **App integration** → **App clients** → Select your client
3. Edit **Hosted UI settings**

Add your Amplify URLs:

**Allowed callback URLs:**
```
http://localhost:3000/api/auth/callback/cognito
https://your-amplify-domain.amplifyapp.com/api/auth/callback/cognito
```

**Allowed sign-out URLs:**
```
http://localhost:3000
https://your-amplify-domain.amplifyapp.com
```

#### Step 4: Clear Build Cache and Deploy

1. In **Amplify Console** → **App settings** → **Build settings**
2. Scroll down and click **Clear cache**
3. Trigger a new deployment: **Redeploy this version**

Or use AWS CLI:
```bash
aws amplify start-job --app-id <your-app-id> --branch-name main --job-type RELEASE
```

#### Step 5: Verify Deployment

After deployment completes, check the build logs for:

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
✅ AUTH_URL: https://your-domain.amplifyapp.com
✅ NEXTAUTH_URL: https://your-domain.amplifyapp.com

🌐 Auth URL being used: https://your-domain.amplifyapp.com
================================
✅ All required environment variables are present
```

⚠️ **If you see `localhost` anywhere, your environment variables are not configured correctly!**

#### Step 6: Test Production Authentication

1. Visit your Amplify URL: `https://your-domain.amplifyapp.com`
2. Click **Sign In**
3. You should be redirected to AWS Cognito (NOT to `localhost:3000`)
4. After signing in, you should be redirected back to your Amplify domain

---

## File Structure

```
sport-hub/
├── src/
│   ├── lib/
│   │   └── auth.ts                    # NextAuth configuration
│   ├── app/
│   │   ├── api/
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts       # NextAuth API routes
│   │   ├── auth/
│   │   │   ├── signin/
│   │   │   │   └── page.tsx          # Custom sign-in page
│   │   │   └── error/
│   │   │       └── page.tsx          # Auth error page
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Protected page example
│   │   ├── layout.tsx                # Root layout with SessionProvider
│   │   └── SessionProvider.tsx       # Client-side session provider
│   ├── ui/
│   │   └── UserMenu/
│   │       └── index.tsx             # User menu component
│   ├── types/
│   │   └── auth.ts                   # TypeScript auth types
│   └── middleware.ts                 # Route protection middleware
├── scripts/
│   └── check-env.js                  # Build-time env validation
├── amplify.yml                        # Amplify build configuration
├── next.config.ts                     # Next.js config (env vars)
└── .env.local                         # Local environment variables
```

---

## Usage

### Sign In / Sign Out

Users can sign in via:
1. The "Sign In" button in the navigation
2. Accessing a protected route (auto-redirects to sign-in)
3. Direct navigation to `/auth/signin`

Sign out via the user menu dropdown in the navigation.

### Protected Routes

Routes are protected in `src/middleware.ts`. Currently protected:
- `/dashboard` - Example protected dashboard
- `/admin` - Admin routes (if created)

To protect additional routes, update the `protectedRoutes` array in middleware.

### Accessing Session Data

#### Server Components

```typescript
import { auth } from "@lib/auth"

export default async function Page() {
  const session = await auth()

  if (!session) {
    // User not authenticated
    return <div>Please sign in</div>
  }

  return <div>Welcome {session.user.name}</div>
}
```

#### Client Components

```typescript
"use client"
import { useSession } from "next-auth/react"

export default function Component() {
  const { data: session, status } = useSession()

  if (status === "loading") return <div>Loading...</div>
  if (!session) return <div>Not authenticated</div>

  return <div>Welcome {session.user.name}</div>
}
```

#### Server Actions

```typescript
import { auth } from "@lib/auth"

export async function myServerAction() {
  const session = await auth()

  if (!session) {
    throw new Error("Not authenticated")
  }

  // Perform authenticated action
}
```

### Session Data Structure

The session includes:

```typescript
{
  user: {
    id: string          // Cognito user sub
    name: string        // User's name
    email: string       // User's email
    image: string       // Profile picture URL
  },
  accessToken: string   // Cognito access token
  idToken: string       // Cognito ID token
}
```

---

## Troubleshooting

### Common Issues

#### "Configuration" Error

**Symptoms:**
- Redirected to `/auth/error?error=Configuration`
- Error page shows "Server Configuration Error"

**Causes:**
- Missing environment variables
- Environment variables not loaded correctly
- Wrong `AUTH_URL` value

**Solutions:**
1. Verify ALL required environment variables are set
2. Check `AUTH_URL` is set to correct domain (not `localhost` in production)
3. Restart development server after changing `.env.local`
4. In Amplify: Clear build cache and redeploy

**Debug steps:**
```bash
# Check environment variables are loading
node sport-hub/scripts/check-env.js
```

---

#### Redirecting to `localhost:3000` in Production

**Symptoms:**
- Clicking "Sign In" on Amplify redirects to `localhost:3000`
- Error URL shows `https://localhost:3000/auth/error`

**Cause:**
- `AUTH_URL` environment variable in Amplify is set to `localhost:3000`
- Or `AUTH_URL` is not set at all, falling back to old `NEXTAUTH_URL`

**Solution:**
1. In **Amplify Console** → **Environment variables**
2. Set `AUTH_URL=https://your-amplify-domain.amplifyapp.com`
3. Clear build cache
4. Redeploy
5. Check build logs for correct URL

---

#### "redirect_uri_mismatch" Error

**Symptoms:**
- Error from Cognito about invalid redirect URI
- Authentication fails after Cognito sign-in

**Cause:**
- Callback URL not added to Cognito App Client settings
- Mismatch between `AUTH_URL` and Cognito callback URL

**Solution:**
1. In **Cognito Console** → Your App Client → **Hosted UI**
2. Add callback URL: `https://your-domain/api/auth/callback/cognito`
3. Ensure it exactly matches your `AUTH_URL` + `/api/auth/callback/cognito`
4. Save changes in Cognito
5. Test authentication again

---

#### "invalid_client" Error

**Symptoms:**
- Error when trying to authenticate with Cognito
- "Invalid client" message

**Causes:**
- Incorrect `COGNITO_CLIENT_SECRET`
- App Client doesn't have Client Secret enabled

**Solutions:**
1. Verify `COGNITO_CLIENT_SECRET` is correct
2. In Cognito Console, check App Client has "Client Secret" enabled
3. If secret was regenerated, update environment variable

---

#### Session Not Persisting

**Symptoms:**
- User signs in but session doesn't persist
- Redirected back to sign-in after refresh

**Causes:**
- Cookies blocked by browser
- Missing `AUTH_SECRET`
- Domain mismatch

**Solutions:**
1. Check cookies are enabled in browser
2. Verify `AUTH_SECRET` is set and not empty
3. Ensure `AUTH_URL` matches the domain you're accessing
4. Check browser console for cookie errors

---

#### Build Warnings: `!Failed to set up process.env.secrets`

**Symptoms:**
- Warning in Amplify build logs
- May or may not affect functionality

**What it means:**
- Amplify had trouble loading some environment variables
- Only problematic variables fail, others may still load

**Solutions:**
1. Check all required variables are set in Amplify Console
2. Ensure secrets are marked with "Secret" checkbox
3. Don't mark non-secret variables as secrets
4. Check build logs for which specific variables failed
5. Clear cache and redeploy

---

#### Environment Variables Not Loading in Amplify

**Symptoms:**
- Variables set in Amplify Console but not available in build
- `check-env.js` script shows variables as MISSING

**Solutions:**
1. Verify variables are set in the correct environment (not just branch)
2. Check for typos in variable names
3. Ensure you've triggered a new build after adding variables
4. Clear build cache before redeploying
5. Don't use quotes around values in Amplify Console

---

### Debug Checklist

Use this checklist to debug authentication issues:

- [ ] All required environment variables are set
- [ ] `AUTH_SECRET` is generated and set
- [ ] `AUTH_URL` matches your actual domain (not localhost in production)
- [ ] Cognito callback URL includes your domain + `/api/auth/callback/cognito`
- [ ] Cognito sign-out URL matches your domain
- [ ] OAuth scopes include `openid` and `email`
- [ ] Build logs show all environment variables as present
- [ ] Build logs show correct `AUTH_URL` being used
- [ ] Cookies are enabled in browser
- [ ] No CORS errors in browser console

---

## Security Notes

✅ **Implemented Security Features:**
- Client Secret stored in environment variables (never in code)
- Sessions use HTTP-only cookies
- JWT strategy for session management
- CSRF protection enabled by default
- Middleware-based route protection
- Secrets marked as "Secret" in Amplify (encrypted)
- Environment variable validation at build time

🔒 **Best Practices:**
- Rotate `AUTH_SECRET` and `COGNITO_CLIENT_SECRET` periodically
- Use different secrets for development and production
- Never commit `.env.local` to version control
- Monitor Cognito sign-in attempts
- Review protected routes regularly

---

## Modified Files

The following files support authentication and deployment:

| File                                              | Purpose                                  |
|---------------------------------------------------|------------------------------------------|
| [src/lib/auth.ts](../sport-hub/src/lib/auth.ts)                     | NextAuth configuration                   |
| [src/types/auth.ts](../sport-hub/src/types/auth.ts)                 | TypeScript type definitions              |
| [src/middleware.ts](../sport-hub/src/middleware.ts)                 | Route protection                         |
| [next.config.ts](../sport-hub/next.config.ts)                       | Environment variable exposure            |
| [scripts/check-env.js](../sport-hub/scripts/check-env.js)           | Build-time validation                    |
| [amplify.yml](../sport-hub/amplify.yml)                             | Amplify build configuration              |

---

## Resources

### Documentation

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [NextAuth.js Migration Guide (v4 → v5)](https://authjs.dev/getting-started/migrating-to-v5)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [AWS Amplify Environment Variables](https://docs.aws.amazon.com/amplify/latest/userguide/environment-variables.html)
- [OIDC Specification](https://openid.net/connect/)

### Useful Commands

```bash
# Generate new AUTH_SECRET
openssl rand -base64 32

# Run environment variable check
node scripts/check-env.js

# Start development server
pnpm dev

# Build for production
pnpm build

# Clear Next.js cache
rm -rf .next
```

### Support

For issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Amplify build logs
3. Check browser console for errors
4. Verify Cognito configuration in AWS Console
