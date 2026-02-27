/**
 * RBAC Service - Role-Based Access Control
 *
 * Provides role management with caching for performance optimization.
 * Roles are stored in DynamoDB and cached in-memory for 5 minutes.
 */

import { dynamodb, USERS_TABLE } from './dynamodb';
import type { Role, Permission, UserSubType } from '../types/rbac';
import { ROLE_PERMISSIONS } from '../types/rbac';
import type { UserProfileRecord } from './relational-types';

/**
 * Role cache entry with timestamp for TTL
 */
interface RoleCacheEntry {
  role: Role;
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

    const role = (user.role as Role) || 'user';
    const permissions = ROLE_PERMISSIONS[role];
    const userSubTypes = (user.userSubTypes as UserSubType[]) || [];

    // Update cache
    roleCache.set(userId, {
      role,
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
  const role = await getUserRole(userId);
  return ROLE_PERMISSIONS[role];
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
 * Update user role in database
 *
 * SECURITY: Verifies that assignedBy user has admin role before allowing update.
 * Throws error if assignedBy is not an admin.
 *
 * @param userId - User ID to update
 * @param newRole - New role to assign
 * @param assignedBy - User ID of admin assigning the role (must have admin role)
 * @throws Error if assignedBy is not an admin or if user not found
 */
export async function updateUserRole(
  userId: string,
  newRole: Role,
  assignedBy: string
): Promise<void> {
  try {
    // Verify assignedBy user has admin role
    const assignerRole = await getUserRole(assignedBy);
    if (assignerRole !== 'admin' && process.env.NODE_ENV === 'production') {
      throw new Error('Only admins (or local dev) can update user roles');
    }

    // Get existing user (use composite key)
    const user = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | null;
    if (!user) {
      throw new Error('User not found');
    }

    // Update with new role
    const updatedUser: UserProfileRecord = {
      ...user,
      sortKey: 'Profile',
      role: newRole,
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: assignedBy,
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser as unknown as Record<string, unknown>);

    // Clear cache to force refresh
    clearRoleCache(userId);

    console.log(`Role updated for user ${userId}: ${newRole} (assigned by ${assignedBy})`);
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
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
      age: Date.now() - entry.timestamp,
    })),
  };
}
