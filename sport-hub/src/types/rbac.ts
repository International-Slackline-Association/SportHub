/**
 * RBAC (Role-Based Access Control) Type Definitions for SportHub
 *
 * This file defines the core types for role-based authorization throughout
 * the application.
 */

/**
 * Primary roles for access control
 * - user: Default role for all users, can view content and edit own profile
 * - event_manager: Event Manager. Creates, approves and edits events, competitions and results
 * - record_manager: Record Manager. Reviews claims and manages records, firsts and categories
 * - user_manager: User Manager. Creates, edits, deletes and merges user accounts and sets user types (not roles)
 * - admin: General admin. Full access, incl. user management and role assignment.
 *   Stored as 'admin' so existing admins keep full access without a data migration.
 */
export type Role = 'user' | 'event_manager' | 'record_manager' | 'user_manager' | 'admin';

/** Every role, in the order shown when assigning roles. */
export const ROLES: Role[] = ['user', 'event_manager', 'record_manager', 'user_manager', 'admin'];

export const ROLE_LABELS: Record<Role, string> = {
  user: 'User',
  event_manager: 'Event Manager',
  record_manager: 'Record Manager',
  user_manager: 'User Manager',
  admin: 'General Admin',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  user: 'Standard access',
  event_manager: 'Events, competitions and results',
  record_manager: 'Records, firsts and categories',
  user_manager: 'User accounts and duplicates',
  admin: 'Full access incl. users and roles',
};

export const isRole = (value: unknown): value is Role => ROLES.includes(value as Role);

/**
 * User sub-types for additional classification (future use)
 * These are NOT used for authorization, only for display/filtering
 */
export type UserSubType = 'judge' | 'organizer' | 'athlete';

/**
 * Granular permissions for fine-grained access control
 * Format: resource:action
 *
 * NOTE: Only restricted operations need permissions.
 * Public data (events, rankings, user profiles) can be accessed without permissions.
 */
export type Permission =
  // Event permissions (write operations only - read is public)
  | 'events:create'
  | 'events:edit'
  | 'events:delete'

  // User management (User Manager and General admin). Assigning roles stays General admin only.
  | 'users:manage'

  // Ranking management
  | 'rankings:edit'

  // World records & firsts. Submitting a claim only needs a signed-in user.
  // records:review is separate from records:manage so the Sport Commission's
  // records group can review later without code changes.
  | 'records:review'
  | 'records:manage'

  // Admin dashboard access
  | 'admin:access';

/**
 * Permission groups mapped to each role
 *
 * NOTE: 'user' role has no special permissions by default.
 * Users can access all public content and edit their own profile
 * (ownership enforced by canEditUser() check).
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: [],  // No special permissions - public access + own profile only
  event_manager: [
    'events:create',
    'events:edit',
    'events:delete',
    'rankings:edit',
    'admin:access',
  ],
  record_manager: [
    'records:review',
    'records:manage',
    'admin:access',
  ],
  user_manager: [
    'users:manage',
    'admin:access',
  ],
  admin: [
    'events:create',
    'events:edit',
    'events:delete',
    'users:manage',
    'rankings:edit',
    'records:review',
    'records:manage',
    'admin:access',
  ],
} as const;

/**
 * Whether a role grants a permission. Derived from the role (not from the
 * permissions copied into the session token) so it works the same on server,
 * client and in middleware. General admins always pass.
 */
export function roleHasPermission(role: Role | string | undefined | null, permission: Permission): boolean {
  if (role === 'admin') return true;
  return isRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}

/**
 * Authorization result with detailed information
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  userId?: string;
  role?: Role;
}

/**
 * Resource ownership check parameters
 */
export interface ResourceOwnership {
  resourceUserId: string;
  requestingUserId: string;
}
