/**
 * RBAC (Role-Based Access Control) Type Definitions for SportHub
 *
 * This file defines the core types for role-based authorization throughout
 * the application.
 */

/**
 * Primary roles for access control
 * - user: Default role for all users, can view content and edit own profile
 * - admin: Full access to all features including event creation and user management
 */
export type Role = 'user' | 'admin';

/**
 * User sub-types for additional role-based permissions
 *
 * Sub-types provide granular permissions beyond the base user/admin roles:
 * - organizer: Can create events and edit their own submitted events
 * - judge: Reserved for future judging capabilities
 * - athlete: Used for filtering (e.g., rankings display)
 *
 * Users can have multiple sub-types simultaneously.
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
  | 'events:edit_own'  // Edit only events submitted by the user
  | 'events:delete'

  // User management (admin only)
  | 'users:manage'

  // Ranking management
  | 'rankings:edit'

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
  admin: [
    'events:create',
    'events:edit',
    'events:delete',
    'users:manage',
    'rankings:edit',
    'admin:access',
  ],
} as const;

/**
 * Permission groups mapped to each user sub-type
 *
 * Sub-type permissions are additive to the base role permissions.
 * For example, a 'user' with 'organizer' sub-type gets both user permissions
 * and organizer permissions.
 */
export const SUBTYPE_PERMISSIONS: Record<UserSubType, Permission[]> = {
  organizer: [
    'events:create',      // Can create new events
    'events:edit_own',    // Can edit only their own submitted events
  ],
  judge: [],              // Reserved for future judging capabilities
  athlete: [],            // Used for filtering/display only, no special permissions
} as const;

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
