import NextAuth from "next-auth"
import Cognito from "next-auth/providers/cognito"

// Log configuration for debugging (only in non-production or with safe values)
if (process.env.NODE_ENV !== 'production') {
  console.log('Auth Config:', {
    clientId: process.env.COGNITO_CLIENT_ID,
    region: process.env.COGNITO_REGION,
    poolId: process.env.COGNITO_USER_POOL_ID,
    authUrl: process.env.NEXTAUTH_URL || 'auto-detected',
  })
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  basePath: "/api/auth",
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
  trustHost: true,
})
