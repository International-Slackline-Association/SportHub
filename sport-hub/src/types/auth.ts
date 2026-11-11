import { DefaultSession } from "next-auth"
import { Role, Permission, UserSubType } from './rbac'

declare module "next-auth" {
  /**
   * Extends the built-in session type to include Cognito-specific fields and RBAC
   */
  interface Session {
    user: {
      id: string                     // SportHub user ID (SportHubID:xxx) — sporthub-users partition key. isaUsersId is the optional ISA identity link.
      cognitoSub?: string            // Cognito UUID (for debugging/reference)
      roles: Role[]                  // Admin roles; permissions combine. Empty = normal user
      permissions?: Permission[]     // Combined permissions of roles (informational; checks use roleHasPermission(roles, …))
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
    roles?: Role[]
    permissions?: Permission[]
    userSubTypes?: UserSubType[]
  }
}
