/**
 * Authorization Utilities
 *
 * Helper functions for checking user permissions and roles throughout the application.
 * These functions provide a clean API for authorization checks in pages, components, and server actions.
 */

import { auth } from './auth';
import type { Role, Permission, UserSubType, AuthorizationResult } from '../types/rbac';
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
  if (session.user.role === 'admin') return true;

  return session.user.role === requiredRole;
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

  return roles.includes(session.user.role);
}

/**
 * Check if user has a specific permission
 *
 * @param permission - Permission to check for
 * @returns True if user has the permission
 */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.permissions) return false;

  return session.user.permissions.includes(permission);
}

/**
 * Check if user has ALL of the specified permissions
 *
 * @param permissions - Array of permissions to check
 * @returns True if user has all permissions
 */
export async function hasAllPermissions(permissions: Permission[]): Promise<boolean> {
  const session = await auth();
  if (!session?.user?.permissions) return false;

  return permissions.every(p => session.user.permissions!.includes(p));
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
  if (session.user.role === 'admin') {
    return;
  }

  if (session.user.role !== requiredRole) {
    redirect(`${redirectUrl}?required=${requiredRole}`);
  }
}

/**
 * Require admin role - redirect if not admin
 *
 * Shorthand for requireRole('admin')
 */
export async function requireAdmin(): Promise<void> {
  await requireRole('admin');
}

/**
 * Require admin role OR organizer sub-type - redirect if neither
 *
 * Used for event submission, which is accessible to both admins and organizers.
 */
export async function requireEventSubmitter(): Promise<void> {
  const session = await auth();

  if (!session) {
    redirect('/auth/signin?error=SessionRequired');
  }

  if (
    session.user.role === 'admin' ||
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

  // Admins can edit anyone
  if (session.user.role === 'admin') {
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
  return session?.user?.role === 'admin';
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
