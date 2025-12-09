import { DefaultSession } from "next-auth"
import { Role, Permission, UserSubType } from './rbac'

declare module "next-auth" {
  /**
   * Extends the built-in session type to include Cognito-specific fields and RBAC
   */
  interface Session {
    user: {
      id: string
      role: Role                    // User's role: 'user' | 'admin'
      permissions?: Permission[]     // Granular permissions based on role
      subTypes?: UserSubType[]       // User sub-types: 'organizer', 'judge', 'athlete'
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
    subTypes?: UserSubType[]
  }
}
