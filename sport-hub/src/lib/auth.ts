import NextAuth from "next-auth"
import Cognito from "next-auth/providers/cognito"
import { getUserAccess, getUserSubTypes } from './rbac-service'
import { ensureUserExists, enrichUserFromReferenceDb } from './onboarding'
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

/**
 * Version of the roles stored in the session token. Sessions with another
 * (or no) version reload their roles once, without signing out.
 * TRANSITION: version 2 also repairs sessions from the multi-role rollout
 * that stored an empty roles list after a failed lookup.
 */
const ROLES_VERSION = 2

export const { handlers, signIn, signOut, auth, unstable_update } = NextAuth({
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
    async jwt({ token, account, profile, trigger }) {
      // Re-fetch subtypes when session is explicitly updated (e.g. after becomeOrganizer)
      if (trigger === 'update' && token.sportHubUserId) {
        try {
          const userSubTypes = await getUserSubTypes(token.sportHubUserId as string);
          token.userSubTypes = userSubTypes;
        } catch {
          // non-fatal — keep existing subtypes in token
        }
        return token;
      }

      // Pass Cognito user info to token
      if (account && profile) {
        token.sub = profile.sub ?? undefined
        token.email = profile.email ?? undefined
        token.accessToken = account.access_token
        token.idToken = account.id_token

        // Link Cognito user to sporthub-users record
        // Check by email first (covers migrated users and previously onboarded users)
        // If not found, create a new sporthub record via ensureUserExists
        if (token.sub && token.email) {
          try {
            // First, check if user already exists in sporthub-users by email
            const existingUser = await getUserByEmail(token.email as string);

            if (existingUser) {
              // Use existing user's SportHub ID (sporthub-users partition key)
              token.sportHubUserId = existingUser.userId;
              token.name = existingUser.name;
              console.log(`[Auth] Found existing user by email: ${existingUser.userId}`);

              // Back-fill any missing reference DB fields (isaUsersId, name, country, etc.)
              // on every login until all fields are populated. enrichUserFromReferenceDb
              // is a no-op when nothing is missing. Must be awaited — fire-and-forget is
              // killed before completion in serverless runtimes.
              const needsEnrichment = !existingUser.isaUsersId || !existingUser.name
                || !existingUser.country || !existingUser.gender || !existingUser.birthdate
                || !existingUser.athleteSlug;
              if (needsEnrichment) {
                await enrichUserFromReferenceDb(existingUser, token.email as string).catch(err =>
                  console.warn('[Auth] Non-fatal: could not enrich user from isa-users:', err)
                );
              }
            } else {
              // New user — create sporthub record, returns SportHubID:xxx
              const sportHubUserId = await ensureUserExists(
                token.sub,
                token.email as string,
                token.email as string  // Use email as name fallback
              );
              token.sportHubUserId = sportHubUserId;
              console.log(`[Auth] Created new user via onboarding: ${sportHubUserId}`);
            }
          } catch (error) {
            console.error('Error in user lookup/onboarding:', error);
            // Continue without custom ID - role lookup returns no roles
          }
        }

        // Roles are loaded below; no SportHub ID (onboarding failed) means no roles
        token.roles = []
        token.permissions = []
        token.userSubTypes = []
        token.rolesVersion = undefined
      }

      // Load roles from sporthub-users on sign-in, and once for sessions whose
      // roles were stored with an older ROLES_VERSION.
      // A failed lookup is not stored, so it is retried on the next request
      // instead of leaving the user without roles until they sign in again.
      if (token.rolesVersion !== ROLES_VERSION && token.sportHubUserId) {
        const access = await getUserAccess(token.sportHubUserId as string)
        if (access) {
          token.roles = access.roles
          token.permissions = access.permissions
          token.userSubTypes = access.userSubTypes
          token.rolesVersion = ROLES_VERSION
        }
      }
      return token
    },
    async session({ session, token }) {
      // Pass token data to session
      if (token) {
        // Use SportHub user ID as the primary session ID (SportHubID:xxx)
        // Falls back to Cognito sub if onboarding failed
        session.user.id = (token.sportHubUserId as string) || (token.sub as string)
        session.user.cognitoSub = token.sub as string  // Keep Cognito sub for debugging
        session.user.email = token.email as string
        // Note: name and image not available without profile scope from Cognito
        session.accessToken = token.accessToken as string
        session.idToken = token.idToken as string

        // Pass roles, permissions, and sub-types to session
        session.user.roles = (token.roles as Role[] | undefined) ?? []
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
