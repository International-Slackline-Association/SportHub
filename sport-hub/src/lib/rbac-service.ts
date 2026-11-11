/**
 * RBAC Service - Role-Based Access Control
 *
 * Provides role management with caching for performance optimization.
 * Roles are stored in DynamoDB and cached in-memory for 5 minutes.
 */

import { dynamodb, USERS_TABLE } from './dynamodb';
import type { Role, Permission, UserSubType } from '../types/rbac';
import { permissionsOf, rolesOf } from '../types/rbac';
import type { UserProfileRecord } from './relational-types';

/**
 * Role cache entry with timestamp for TTL
 */
interface RoleCacheEntry {
  roles: Role[];
  permissions: Permission[];
  userSubTypes: UserSubType[];
  timestamp: number;
}

// In-memory cache with 5-minute TTL
const roleCache = new Map<string, RoleCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

const EMPTY_ENTRY = { roles: [], permissions: [], userSubTypes: [] };

/**
 * Load a user's roles, permissions and sub-types from the database, with caching.
 * New users (no profile yet) and failed lookups get no roles.
 *
 * @param userId - Custom user ID (SportHubID:xxx or ISA_xxx format), NOT Cognito UUID.
 *                 This must match the partition key in the users table.
 */
async function loadAccess(userId: string): Promise<Omit<RoleCacheEntry, 'timestamp'>> {
  const cached = roleCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }

  try {
    const user = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | null;
    // New user: created on first login by the onboarding service
    if (!user) return EMPTY_ENTRY;

    const roles = rolesOf(user);
    const entry = {
      roles,
      permissions: permissionsOf(roles),
      userSubTypes: (user.userSubTypes as UserSubType[]) || [],
    };
    roleCache.set(userId, { ...entry, timestamp: Date.now() });
    return entry;
  } catch (error) {
    console.error('Error fetching user roles:', error);
    // Fail-safe: no roles
    return EMPTY_ENTRY;
  }
}

/**
 * Get all of a user's roles (permissions combine across them). Empty = normal user.
 */
export async function getUserRoles(userId: string): Promise<Role[]> {
  return (await loadAccess(userId)).roles;
}

/**
 * Get user's combined permissions from their roles
 *
 * @param userId - Custom user ID (SportHubID:xxx or ISA_xxx format), NOT Cognito UUID.
 *                 This must match the partition key in the users table.
 * @returns Array of permissions
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  return (await loadAccess(userId)).permissions;
}

/**
 * Get user's sub-types from database with caching
 *
 * @param userId - Custom user ID (SportHubID:xxx or ISA_xxx format)
 * @returns Array of UserSubType values
 */
export async function getUserSubTypes(userId: string): Promise<UserSubType[]> {
  return (await loadAccess(userId)).userSubTypes;
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
      roles: entry.roles,
      age: Date.now() - entry.timestamp,
    })),
  };
}
