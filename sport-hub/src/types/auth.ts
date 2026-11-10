import { DefaultSession } from "next-auth"
import { Role, AdminRole, Permission, UserSubType } from './rbac'

declare module "next-auth" {
  /**
   * Extends the built-in session type to include Cognito-specific fields and RBAC
   */
  interface Session {
    user: {
      id: string                     // SportHub user ID (SportHubID:xxx) — sporthub-users partition key. isaUsersId is the optional ISA identity link.
      cognitoSub?: string            // Cognito UUID (for debugging/reference)
      role: Role                     // Legacy single role (primaryRole of roles); use roles for checks
      roles: AdminRole[]             // All admin roles; permissions combine. Empty = normal user
      permissions?: Permission[]     // Granular permissions based on role
      userSubTypes?: UserSubType[]   // User sub-types: 'athlete' | 'organizer' | 'judge'
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
    roles?: AdminRole[]
    permissions?: Permission[]
    userSubTypes?: UserSubType[]
  }
}
