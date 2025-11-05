import NextAuth from "next-auth"
import Cognito from "next-auth/providers/cognito"

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

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",
  secret: process.env.AUTH_SECRET,
  providers: [
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
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      // Pass Cognito user info to token
      if (account && profile) {
        token.sub = profile.sub ?? undefined
        token.email = profile.email ?? undefined
        token.name = profile.name ?? undefined
        token.picture = profile.picture ?? undefined
        token.accessToken = account.access_token
        token.idToken = account.id_token
      }
      return token
    },
    async session({ session, token }) {
      // Pass token data to session
      if (token) {
        session.user.id = token.sub as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
        session.accessToken = token.accessToken as string
        session.idToken = token.idToken as string
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
