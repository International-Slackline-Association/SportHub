/**
 * RBAC Service - Role-Based Access Control
 *
 * Provides role management with caching for performance optimization.
 * Roles are stored in DynamoDB and cached in-memory for 5 minutes.
 */

import { dynamodb, USERS_TABLE } from './dynamodb';
import type { Role, AdminRole, Permission, UserSubType } from '../types/rbac';
import { permissionsOf, primaryRole, rolesOf } from '../types/rbac';
import type { UserProfileRecord } from './relational-types';

/**
 * Role cache entry with timestamp for TTL
 */
interface RoleCacheEntry {
  role: Role;
  roles: AdminRole[];
  permissions: Permission[];
  userSubTypes: UserSubType[];
  timestamp: number;
}

// In-memory cache with 5-minute TTL
const roleCache = new Map<string, RoleCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Get user's role from database with caching
 *
 * @param userId - Custom user ID (SportHubID:xxx or ISA_xxx format), NOT Cognito UUID.
 *                 This must match the partition key in the users table.
 * @returns User's role ('user' or 'admin')
 */
export async function getUserRole(userId: string): Promise<Role> {
  // Check cache first
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.role;
  }

  try {
    // Fetch from database (use composite key)
    const user = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | null;

    if (!user) {
      // New user - return default role
      // User will be created on first login by onboarding service
      return 'user';
    }

    const roles = rolesOf(user);
    const role = primaryRole(roles);
    const permissions = permissionsOf(roles);
    const userSubTypes = (user.userSubTypes as UserSubType[]) || [];

    // Update cache
    roleCache.set(userId, {
      role,
      roles,
      permissions,
      userSubTypes,
      timestamp: Date.now(),
    });

    return role;
  } catch (error) {
    console.error('Error fetching user role:', error);
    // Fail-safe: default to user role
    return 'user';
  }
}

/**
 * Get user's permissions based on role
 *
 * @param userId - Custom user ID (SportHubID:xxx or ISA_xxx format), NOT Cognito UUID.
 *                 This must match the partition key in the users table.
 * @returns Array of permissions
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  // Check cache first
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }

  // Fetch role (which will also cache permissions)
  await getUserRole(userId);
  return roleCache.get(userId)?.permissions ?? [];
}

/**
 * Get all of a user's admin roles (permissions combine across them)
 *
 * @param userId - Custom user ID (SportHubID:xxx or ISA_xxx format)
 */
export async function getUserRoles(userId: string): Promise<AdminRole[]> {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.roles;
  }
  await getUserRole(userId);
  return roleCache.get(userId)?.roles ?? [];
}

/**
 * Get user's sub-types from database with caching
 *
 * @param userId - Custom user ID (SportHubID:xxx or ISA_xxx format)
 * @returns Array of UserSubType values
 */
export async function getUserSubTypes(userId: string): Promise<UserSubType[]> {
  // Check cache first
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.userSubTypes;
  }

  // Fetch role (which will also cache userSubTypes)
  await getUserRole(userId);
  return roleCache.get(userId)?.userSubTypes ?? [];
}

/**
 * Clear role cache for a specific user
 *
 * Call this after role changes to ensure fresh data
 *
 * @param userId - User ID to clear from cache
 */
export function clearRoleCache(userId: string): void {
  roleCache.delete(userId);
}

/**
 * Clear all role caches
 *
 * Use for testing or administrative purposes
 */
export function clearAllRoleCache(): void {
  roleCache.clear();
  console.log('All role caches cleared');
}

/**
 * Get cache statistics (for debugging/monitoring)
 */
export function getCacheStats() {
  return {
    size: roleCache.size,
    ttl: CACHE_TTL,
    entries: Array.from(roleCache.entries()).map(([userId, entry]) => ({
      userId,
      role: entry.role,
      roles: entry.roles,
      age: Date.now() - entry.timestamp,
    })),
  };
}
