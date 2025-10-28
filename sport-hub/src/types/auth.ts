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

declare module "next-auth/jwt" {
  /**
   * Extends the JWT token type to include Cognito tokens
   */
  interface JWT {
    accessToken?: string
    idToken?: string
  }
}
