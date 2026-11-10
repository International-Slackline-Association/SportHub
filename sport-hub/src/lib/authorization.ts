/**
 * Authorization Utilities
 *
 * Helper functions for checking user permissions and roles throughout the application.
 * These functions provide a clean API for authorization checks in pages, components, and server actions.
 */

import { auth } from './auth';
import type { Role, Permission, UserSubType, AuthorizationResult } from '../types/rbac';
import { isGeneralAdmin, roleHasPermission } from '../types/rbac';
import { redirect } from 'next/navigation';

/**
 * Get current user's session with type safety
 *
 * @returns User session or null if not authenticated
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user || null;
}

/**
 * Require authentication - redirect if not logged in
 *
 * @param redirectUrl - URL to redirect to if not authenticated (default: /auth/signin)
 * @returns Session object
 */
export async function requireAuth(redirectUrl: string = '/auth/signin') {
  const session = await auth();
  if (!session) {
    redirect(redirectUrl);
  }
  return session;
}

/**
 * Check if user has a specific role
 *
 * @param requiredRole - Role to check for
 * @returns True if user has the role
 */
export async function hasRole(requiredRole: Role): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  // Admin has access to everything
  if (isGeneralAdmin(session.user.roles)) return true;

  return requiredRole === 'user' || session.user.roles.includes(requiredRole);
}

/**
 * Check if user has ANY of the specified roles
 *
 * @param roles - Array of roles to check
 * @returns True if user has any of the roles
 */
export async function hasAnyRole(roles: Role[]): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;

  return roles.some(r => r === 'user' || session.user.roles.includes(r));
}

/**
 * Check if user has a specific permission
 *
 * @param permission - Permission to check for
 * @returns True if user has the permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await auth();
  return roleHasPermission(session?.user?.roles, permission);
}

/**
 * Check if user has ALL of the specified permissions
 *
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export async function hasAllPermissions(permissions: Permission[]): Promise<boolean> {
  const session = await auth();
  return permissions.every(p => roleHasPermission(session?.user?.roles, p));
}

/**
 * Require specific role - redirect if unauthorized
 *
 * @param requiredRole - Role required to access the resource
 * @param redirectUrl - URL to redirect to if unauthorized (default: /unauthorized)
 */
export async function requireRole(
  requiredRole: Role,
  redirectUrl: string = '/unauthorized'
): Promise<void> {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin?error=SessionRequired');
  }

  // Admins can access everything
  if (isGeneralAdmin(session.user.roles)) {
    return;
  }

  if (requiredRole !== 'user' && !session.user.roles.includes(requiredRole)) {
    redirect(`${redirectUrl}?required=${requiredRole}`);
  }
}

/**
 * Require a permission - redirect if the user's role does not grant it.
 * General admins always pass.
 */
export async function requirePermission(
  permission: Permission,
  redirectUrl: string = '/unauthorized'
): Promise<void> {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin?error=SessionRequired');
  }

  if (!roleHasPermission(session.user.roles, permission)) {
    redirect(`${redirectUrl}?required=${permission}`);
  }
}

/** Event Manager or General admin (events, competitions, results). */
export async function requireEventManager(): Promise<void> {
  await requirePermission('events:edit');
}

/** Record Manager or General admin (records, firsts, categories). */
export async function requireRecordManager(): Promise<void> {
  await requirePermission('records:manage');
}

/** User Manager or General admin (user accounts, duplicates). */
export async function requireUserManager(): Promise<void> {
  await requirePermission('users:manage');
}

/**
 * For user-management server actions: throws unless the user may manage users.
 * Skipped in development, where sign-in is disabled (same rule as the test pages).
 * Pass extra permissions that are also accepted (e.g. events:edit for creating
 * pending athletes during event approval).
 */
export async function assertCanManageUsers(...alsoAllowed: Permission[]): Promise<void> {
  if (process.env.NODE_ENV === 'development') return;
  const session = await auth();
  if (!session) throw new Error('Unauthorized: sign in required');
  const allowed = ['users:manage' as const, ...alsoAllowed].some(p => roleHasPermission(session.user.roles, p));
  if (!allowed) throw new Error('Unauthorized: User Manager or General admin required');
}

/**
 * Who may set a user's roles and types. General admins may set anything.
 * User Managers may set user types and grant or remove Event, Record and User
 * Manager, but may not grant or remove General Admin.
 * Returns an error message, or null when allowed. Development allows everything.
 */
export function roleChangeError(
  actorRoles: readonly Role[] | undefined,
  currentRoles: readonly Role[],
  newRoles: readonly Role[],
): string | null {
  if (process.env.NODE_ENV === 'development') return null;
  if (isGeneralAdmin(actorRoles)) return null;
  if (!roleHasPermission(actorRoles, 'users:manage')) return 'User Manager or General admin required';
  if (isGeneralAdmin(currentRoles) !== isGeneralAdmin(newRoles)) return 'Only a General admin can grant or remove General Admin';
  return null;
}

/**
 * Require General admin role - redirect if not admin
 *
 * Shorthand for requireRole('admin'). Use requireEventManager /
 * requireRecordManager for pages the narrower roles may open.
 */
export async function requireAdmin(): Promise<void> {
  await requireRole('admin');
}

/**
 * Require an event role (Event Manager / General admin) OR organizer sub-type - redirect if neither
 *
 * Used for event submission, which is accessible to event admins and organizers.
 */
export async function requireEventSubmitter(): Promise<void> {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin?error=SessionRequired');
  }

  if (
    roleHasPermission(session.user.roles, 'events:create') ||
    (session.user.userSubTypes as UserSubType[] | undefined)?.includes('organizer')
  ) {
    return;
  }

  redirect('/unauthorized');
}

/**
 * Check if user can edit a resource (ownership-based)
 *
 * Users can edit their own resources, admins can edit any resource
 *
 * @param targetUserId - ID of the user who owns the resource
 * @returns Authorization result with details
 */
export async function canEditUser(targetUserId: string): Promise<AuthorizationResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      authorized: false,
      reason: 'Not authenticated',
    };
  }

  // User Managers and General admins can edit anyone
  if (roleHasPermission(session.user.roles, 'users:manage')) {
    return {
      authorized: true,
      userId: session.user.id,
      role: session.user.role,
    };
  }

  // Users can only edit their own profile
  if (session.user.id === targetUserId) {
    return {
      authorized: true,
      userId: session.user.id,
      role: session.user.role,
    };
  }

  return {
    authorized: false,
    reason: 'Insufficient permissions - you can only edit your own profile',
    userId: session.user.id,
    role: session.user.role,
  };
}

/**
 * Authorize or throw error (for server actions)
 *
 * @param check - Async function that returns true if authorized
 * @param errorMessage - Error message to throw if not authorized
 */
export async function authorizeOrThrow(
  check: () => Promise<boolean>,
  errorMessage: string = 'Unauthorized'
): Promise<void> {
  const authorized = await check();
  if (!authorized) {
    throw new Error(errorMessage);
  }
}

/**
 * Check if current user is an admin
 *
 * @returns True if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return isGeneralAdmin(session?.user?.roles);
}

/**
 * Check if current user is authenticated
 *
 * @returns True if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await auth();
  return !!session;
}
