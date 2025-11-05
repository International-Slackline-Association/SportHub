import { DefaultSession } from "next-auth"

declare module "next-auth" {
  /**
   * Extends the built-in session type to include Cognito-specific fields
   */
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
    accessToken?: string
    idToken?: string
  }

  /**
   * Extends the built-in user type
   */
  interface User {
    id: string
  }
}

// Note: JWT token extensions are handled inline in the callbacks
// NextAuth v5 beta doesn't support module augmentation for next-auth/jwt
