# AWS Cognito OIDC Authentication Setup

This application uses AWS Cognito with the OIDC protocol for authentication via NextAuth.js v5.

## Configuration

### Environment Variables

Add the following to your [.env.local](.env.local):

```bash
# AWS Cognito Authentication (OIDC)
COGNITO_CLIENT_ID=13n3pj9pc57077813tcukvo004
COGNITO_CLIENT_SECRET=<your-client-secret-here>
COGNITO_USER_POOL_ID=eu-central-1_iGaYGKeyJ
COGNITO_REGION=eu-central-1

# NextAuth Configuration
AUTH_SECRET=<generated-secret>
NEXTAUTH_URL=http://localhost:3000
```

**Required Action:** Replace `<your-client-secret-here>` with your actual Cognito Client Secret.

The `AUTH_SECRET` has been auto-generated. To generate a new one:
```bash
openssl rand -base64 32
```

### AWS Cognito Setup

Your Cognito User Pool is configured as:
- **User Pool ID:** `eu-central-1_iGaYGKeyJ`
- **Client ID:** `13n3pj9pc57077813tcukvo004`
- **Region:** `eu-central-1`
- **Domain:** `https://auth.slacklineinternational.org`

#### Required Cognito Configuration

In your AWS Cognito Console, ensure the following:

1. **Callback URLs** - Add these to your App Client settings:
   - Development: `http://localhost:3000/api/auth/callback/cognito`
   - Production: `https://your-domain.com/api/auth/callback/cognito`

2. **Sign Out URLs**:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`

3. **OAuth 2.0 Grant Types**:
   - ✅ Authorization code grant
   - ✅ Implicit grant (optional)

4. **OAuth Scopes**:
   - ✅ openid
   - ✅ email
   - ✅ profile

5. **Identity Providers**:
   - Ensure Cognito User Pool is enabled

## File Structure

```
src/
├── lib/
│   └── auth.ts                    # NextAuth configuration
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts       # NextAuth API routes
│   ├── auth/
│   │   ├── signin/
│   │   │   └── page.tsx          # Custom sign-in page
│   │   └── error/
│   │       └── page.tsx          # Auth error page
│   ├── dashboard/
│   │   └── page.tsx              # Protected page example
│   ├── layout.tsx                # Root layout with SessionProvider
│   └── SessionProvider.tsx       # Client-side session provider
├── ui/
│   └── UserMenu/
│       └── index.tsx             # User menu component
├── types/
│   └── auth.ts                   # TypeScript auth types
└── middleware.ts                 # Route protection middleware
```

## Usage

### Sign In/Out

Users can sign in via:
1. The "Sign In" button in the navigation
2. Accessing a protected route (auto-redirects to sign-in)
3. Direct navigation to `/auth/signin`

Sign out via the user menu dropdown in the navigation.

### Protected Routes

Routes are protected in [src/middleware.ts](src/middleware.ts). Currently protected:
- `/dashboard` - Example protected dashboard
- `/admin` - Admin routes (if created)

To protect additional routes, update the `protectedRoutes` array in middleware.

### Accessing Session Data

**Server Components:**
```typescript
import { auth } from "@lib/auth"

export default async function Page() {
  const session = await auth()

  if (!session) {
    // User not authenticated
  }

  return <div>Welcome {session.user.name}</div>
}
```

**Client Components:**
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

### Server Actions

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

## Session Data

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

## Testing Locally

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Add your Client Secret to [.env.local](.env.local)

3. Start the development server:
   ```bash
   pnpm dev
   ```

4. Navigate to `http://localhost:3000` and click "Sign In"

## Production Deployment

1. Update [.env.local](.env.local) or use environment variables in your hosting platform:
   ```bash
   NEXTAUTH_URL=https://your-production-domain.com
   ```

2. Ensure Cognito callback URLs include your production domain

3. Deploy your application

## Troubleshooting

### "redirect_uri_mismatch" error
- Ensure callback URL is added to Cognito App Client settings
- Check that `NEXTAUTH_URL` matches your current domain

### "invalid_client" error
- Verify `COGNITO_CLIENT_SECRET` is correct
- Ensure App Client has "Client Secret" enabled in Cognito

### Session not persisting
- Check that cookies are enabled in browser
- Verify `AUTH_SECRET` is set

### "Configuration" error
- Ensure all environment variables are set
- Restart your development server after changing `.env.local`

## Security Notes

- ✅ Client Secret is stored in environment variables (never in code)
- ✅ Sessions use HTTP-only cookies
- ✅ JWT strategy for session management
- ✅ CSRF protection enabled by default
- ✅ Middleware-based route protection

## Resources

- [NextAuth.js Documentation](https://authjs.dev/)
- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [OIDC Specification](https://openid.net/connect/)
