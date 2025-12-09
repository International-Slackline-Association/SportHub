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
