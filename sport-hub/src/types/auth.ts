import { DefaultSession } from "next-auth"
import { Role, Permission } from './rbac'

declare module "next-auth" {
  /**
   * Extends the built-in session type to include Cognito-specific fields and RBAC
   */
  interface Session {
    user: {
      id: string                     // Custom user ID (ISA_xxx format) - matches database partition key
      cognitoSub?: string            // Cognito UUID (for debugging/reference)
      role: Role                     // User's role: 'user' | 'admin'
      permissions?: Permission[]     // Granular permissions based on role
    } & DefaultSession["user"]
    accessToken?: string
    idToken?: string
  }

  /**
   * Extends the built-in user type
   */
  interface User {
    id: string
    role: Role
    permissions?: Permission[]
  }
}
