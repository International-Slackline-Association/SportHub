/**
 * RBAC (Role-Based Access Control) Type Definitions for SportHub
 *
 * This file defines the core types for role-based authorization throughout
 * the application.
 */

/**
 * Admin roles. A user holds a list of them (`roles` on the profile, any
 * combination) and gets the combined permissions; an empty list means a
 * normal user (edit own profile, submit claims, submit events as organizer).
 * - event_manager: Event Manager. Creates, approves and edits events, competitions and results
 * - record_manager: Record Manager. Reviews claims and manages records, firsts and categories
 * - user_manager: User Manager. Manages user accounts and user types; grants the manager roles
 * - admin: General Admin. Can do anything, incl. granting General Admin
 */
export type Role = 'event_manager' | 'record_manager' | 'user_manager' | 'admin';

/** Every role, in the order shown when assigning roles. */
export const ROLES: Role[] = ['event_manager', 'record_manager', 'user_manager', 'admin'];

export const ROLE_LABELS: Record<Role, string> = {
  event_manager: 'Event Manager',
  record_manager: 'Record Manager',
  user_manager: 'User Manager',
  admin: 'General Admin',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  event_manager: 'Events, competitions and results',
  record_manager: 'Records, firsts and categories',
  user_manager: 'User accounts, duplicates and manager roles',
  admin: 'Full access incl. granting General Admin',
};

export const isRole = (value: unknown): value is Role => ROLES.includes(value as Role);

/**
 * A profile's roles, cleaned up (known roles only, fixed order).
 *
 * MIGRATION: profiles written before multi-role support have a single
 * `role: 'admin' | 'user'` attribute instead of `roles`. Until
 * `pnpm roles:migrate:*` has run on every environment, an `admin` value there
 * is read as ['admin'] so existing admins keep access. Delete the fallback
 * line after the migration; it is the only place that attribute is read.
 */
export function rolesOf(profile: { roles?: unknown } | null | undefined): Role[] {
  if (!profile) return [];
  if (Array.isArray(profile.roles)) return ROLES.filter(r => (profile.roles as unknown[]).includes(r));
  return (profile as { role?: unknown }).role === 'admin' ? ['admin'] : [];  // MIGRATION fallback, see above
}

/** Validates a roles list from a request: known roles only, no duplicates. Null when invalid. */
export function parseRoles(input: unknown): Role[] | null {
  if (!Array.isArray(input) || !input.every(isRole)) return null;
  return ROLES.filter(r => input.includes(r));
}

type RolesInput = readonly Role[] | null | undefined;

/** True when the roles include General Admin. */
export const isGeneralAdmin = (roles: RolesInput): boolean => !!roles?.includes('admin');

/** Combined permissions of all roles. */
export const permissionsOf = (roles: RolesInput): Permission[] =>
  [...new Set((roles ?? []).filter(isRole).flatMap(r => ROLE_PERMISSIONS[r]))];

/** Human-readable list, e.g. "Event Manager, Record Manager", or "User" for no roles. */
export const rolesLabel = (roles: RolesInput): string => {
  const list = (roles ?? []).filter(isRole);
  return list.length ? list.map(r => ROLE_LABELS[r]).join(', ') : 'User';
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
 * Permissions of each role. A user without roles has none: they can access
 * all public content and edit their own profile (canEditUser() checks ownership).
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
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
  return (roles ?? []).some(r => isRole(r) && ROLE_PERMISSIONS[r].includes(permission));
}

/**
 * Authorization result with detailed information
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  userId?: string;
  roles?: Role[];
}

/**
 * Resource ownership check parameters
 */
export interface ResourceOwnership {
  resourceUserId: string;
  requestingUserId: string;
}
