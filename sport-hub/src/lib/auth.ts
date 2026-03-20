import NextAuth from "next-auth"
import Cognito from "next-auth/providers/cognito"
import { getUserRole, getUserPermissions, getUserSubTypes } from './rbac-service'
import { ensureUserExists } from './onboarding'
import { getUserByEmail } from './user-service'
import type { Role, Permission, UserSubType } from '../types/rbac'

// Validate required environment variables at runtime (not during build)
// During build, secrets may not be available yet - they're only needed when server actually runs
if (globalThis.window === undefined && process.env.NODE_ENV !== 'production') {
  const requiredEnvVars = {
    COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
    COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET,
    COGNITO_REGION: process.env.COGNITO_REGION,
    COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
    AUTH_SECRET: process.env.AUTH_SECRET,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables for NextAuth:', missingVars)
  }

  // Log configuration for debugging in development
  console.log('NextAuth Config:', {
    clientId: process.env.COGNITO_CLIENT_ID,
    region: process.env.COGNITO_REGION,
    poolId: process.env.COGNITO_USER_POOL_ID,
    authUrl: process.env.AUTH_URL || 'auto-detected (trustHost: true)',
    hasClientSecret: !!process.env.COGNITO_CLIENT_SECRET,
    hasAuthSecret: !!process.env.AUTH_SECRET,
  })
}

const cognitoConfigured = !!(
  process.env.COGNITO_CLIENT_ID &&
  process.env.COGNITO_CLIENT_SECRET &&
  process.env.COGNITO_REGION &&
  process.env.COGNITO_USER_POOL_ID
)

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",
  secret: process.env.AUTH_SECRET,
  providers: cognitoConfigured ? [
    Cognito({
      clientId: process.env.COGNITO_CLIENT_ID!,
      clientSecret: process.env.COGNITO_CLIENT_SECRET!,
      issuer: `https://cognito-idp.${process.env.COGNITO_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      // Only using scopes enabled in Cognito
      authorization: {
        params: {
          scope: "openid email"
        }
      }
    })
  ] : [],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Pass Cognito user info to token
      if (account && profile) {
        token.sub = profile.sub ?? undefined
        token.email = profile.email ?? undefined
        token.accessToken = account.access_token
        token.idToken = account.id_token

        // Link Cognito user to sporthub-users record
        // First check if user already exists by email (handles migrated SportHubID users)
        // If not found, create via ensureUserExists (generates ISA_xxx ID)
        if (token.sub && token.email) {
          try {
            // First, check if user already exists in sporthub-users by email
            const existingUser = await getUserByEmail(token.email as string);

            if (existingUser) {
              // Use existing user's ID (could be SportHubID:xxx or ISA_xxx)
              token.customUserId = existingUser.userId;
              console.log(`[Auth] Found existing user by email: ${existingUser.userId}`);
            } else {
              // New user - create via reference DB flow
              const customUserId = await ensureUserExists(
                token.sub,
                token.email as string,
                token.email as string  // Use email as name fallback
              );
              token.customUserId = customUserId;
              console.log(`[Auth] Created new user via onboarding: ${customUserId}`);
            }
          } catch (error) {
            console.error('Error in user lookup/onboarding:', error);
            // Continue without custom ID - role lookup will return default 'user'
          }
        }

        // Load user role, permissions, and sub-types from database using custom ID
        // The database uses custom ID (SportHubID:xxx or ISA_xxx) as partition key
        if (token.customUserId) {
          try {
            const role = await getUserRole(token.customUserId as string)
            const permissions = await getUserPermissions(token.customUserId as string)
            const userSubTypes = await getUserSubTypes(token.customUserId as string)
            token.role = role
            token.permissions = permissions
            token.userSubTypes = userSubTypes
          } catch (error) {
            console.error('Error loading user role:', error)
            // Fail-safe: default to user role
            token.role = 'user'
            token.permissions = []
            token.userSubTypes = []
          }
        } else {
          // No custom ID available - default to user role
          token.role = 'user'
          token.permissions = []
          token.userSubTypes = []
        }
      }
      return token
    },
    async session({ session, token }) {
      // Pass token data to session
      if (token) {
        // Use custom user ID as the primary ID - matches database partition key
        // Could be SportHubID:xxx (migrated users) or ISA_xxx (new users)
        session.user.id = (token.customUserId as string) || (token.sub as string)
        session.user.cognitoSub = token.sub as string  // Keep Cognito sub for debugging
        session.user.email = token.email as string
        // Note: name and image not available without profile scope from Cognito
        session.accessToken = token.accessToken as string
        session.idToken = token.idToken as string

        // Pass role, permissions, and sub-types to session
        session.user.role = (token.role as Role) || 'user'
        session.user.permissions = (token.permissions as Permission[]) || []
        session.user.userSubTypes = (token.userSubTypes as UserSubType[]) || []
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  trustHost: true,
})
