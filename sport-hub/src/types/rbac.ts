/**
 * RBAC (Role-Based Access Control) Type Definitions for SportHub
 *
 * This file defines the core types for role-based authorization throughout
 * the application.
 */

/**
 * Roles for access control. A user holds a list of admin roles (`roles` on the
 * profile) and gets the combined permissions of all of them; no admin role
 * means a normal user.
 * - user: Default role for all users, can view content and edit own profile
 * - event_manager: Event Manager. Creates, approves and edits events, competitions and results
 * - record_manager: Record Manager. Reviews claims and manages records, firsts and categories
 * - user_manager: User Manager. Creates, edits, deletes and merges user accounts and sets user types (not roles)
 * - admin: General admin. Full access, incl. user management and role assignment.
 *   Stored as 'admin' so existing admins keep full access without a data migration.
 */
export type Role = 'user' | 'event_manager' | 'record_manager' | 'user_manager' | 'admin';

/** The admin roles a user can hold (any combination). */
export type AdminRole = Exclude<Role, 'user'>;
export const ADMIN_ROLES: AdminRole[] = ['event_manager', 'record_manager', 'user_manager', 'admin'];

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
export const isAdminRole = (value: unknown): value is AdminRole => ADMIN_ROLES.includes(value as AdminRole);

/**
 * A profile's admin roles. Reads the `roles` list, falling back to the older
 * single `role` field so existing admins (role: 'admin') keep their access.
 */
export function rolesOf(profile: { role?: string | null; roles?: unknown } | null | undefined): AdminRole[] {
  if (!profile) return [];
  if (Array.isArray(profile.roles)) return ADMIN_ROLES.filter(r => (profile.roles as unknown[]).includes(r));
  return isAdminRole(profile.role) ? [profile.role] : [];
}

/** Validates a roles list from a request: admin roles only, no duplicates. Null when invalid. */
export function parseAdminRoles(input: unknown): AdminRole[] | null {
  if (!Array.isArray(input) || !input.every(isAdminRole)) return null;
  return ADMIN_ROLES.filter(r => input.includes(r));
}

/** Single role kept in the legacy `role` field: 'admin' for General admins, else the first admin role, else 'user'. */
export const primaryRole = (roles: readonly Role[]): Role =>
  roles.includes('admin') ? 'admin' : roles.find(isAdminRole) ?? 'user';

type RolesInput = Role | readonly Role[] | string | null | undefined;
const asRoles = (roles: RolesInput): string[] =>
  roles == null ? [] : typeof roles === 'string' ? [roles] : [...roles];

/** True when the roles include General admin. */
export const isGeneralAdmin = (roles: RolesInput): boolean => asRoles(roles).includes('admin');

/** Combined permissions of all roles. */
export const permissionsOf = (roles: RolesInput): Permission[] =>
  [...new Set(asRoles(roles).filter(isRole).flatMap(r => ROLE_PERMISSIONS[r]))];

/** Human-readable list, e.g. "Event Manager, Record Manager" (or "User"). */
export const rolesLabel = (roles: RolesInput): string => {
  const list = asRoles(roles).filter(isAdminRole);
  return list.length ? list.map(r => ROLE_LABELS[r]).join(', ') : ROLE_LABELS.user;
};

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
 * Whether a user's roles grant a permission (any of them is enough, so multiple
 * roles combine). Derived from the roles, not from the permissions copied into
 * the session token, so it works the same on server, client and in middleware.
 * General admins always pass.
 */
export function roleHasPermission(roles: RolesInput, permission: Permission): boolean {
  if (isGeneralAdmin(roles)) return true;
  return asRoles(roles).some(r => isRole(r) && ROLE_PERMISSIONS[r].includes(permission));
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
