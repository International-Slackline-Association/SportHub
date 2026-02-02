/**
 * User Service
 *
 * Handles user CRUD operations with proper authorization checks
 */

import { dynamodb } from './dynamodb';
import type { UserProfileRecord } from './relational-types';
import { updateReferenceUser } from './reference-db-service';

const USERS_TABLE = 'users';

/**
 * User profile update data (allowed fields only)
 * These fields are stored in the reference DB (isa-users table)
 */
export interface UserProfileUpdate {
  name?: string;
  surname?: string;
  phoneNumber?: string;
  gender?: string;
  country?: string;
  city?: string;
  birthDate?: string;
  email?: string;
}

/**
 * Get user by ID
 *
 * @param userId - Custom user ID from reference DB (e.g., "ISA_FBE8B254")
 * @returns User record or null if not found
 */
export async function getUser(userId: string): Promise<UserProfileRecord | null> {
  try {
    const user = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | null;
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Update user profile (only allowed fields)
 * Updates identity data in reference DB (isa-users table)
 *
 * @param userId - Custom user ID (e.g., "ISA_FBE8B254")
 * @param updates - Fields to update
 * @returns Updated user record from app DB
 */
export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<UserProfileRecord> {
  try {
    // Get existing user from app DB
    const existingUser = await getUser(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update identity data in reference DB
    await updateReferenceUser(userId, updates);

    // Update app DB metadata
    const updatedUser: UserProfileRecord = {
      ...existingUser,
      sortKey: 'Profile',
      lastProfileUpdate: Date.now(),
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser as unknown as Record<string, unknown>);

    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Create new user (for onboarding)
 * Only stores app-specific data. Identity data is in reference DB.
 *
 * @param customUserId - Custom user ID from reference DB (e.g., "ISA_FBE8B254")
 * @returns Newly created user record
 */
export async function createUser(
  customUserId: string
): Promise<UserProfileRecord> {
  const newUser: UserProfileRecord = {
    userId: customUserId,       // Custom ID from reference DB
    sortKey: 'Profile',         // Composite key
    role: 'user',               // Default role
    userSubTypes: ['athlete'],  // Default sub-types
    primarySubType: 'athlete',  // Default primary type for GSI
    createdAt: Date.now(),      // Timestamp
    totalPoints: 0,
    contestCount: 0,
    profileCompleted: false,
    roleAssignedAt: new Date().toISOString(),
    roleAssignedBy: 'system',
  };

  await dynamodb.putItem(USERS_TABLE, newUser as unknown as Record<string, unknown>);
  console.log(`Created new user: ${customUserId}`);
  return newUser;
}

/**
 * Check if user exists in database
 *
 * @param userId - User ID to check
 * @returns True if user exists
 */
export async function userExists(userId: string): Promise<boolean> {
  const user = await getUser(userId);
  return user !== null;
}

/**
 * Get user by email
 *
 * Scans the users table for a Profile record with matching email.
 * Used to link Cognito users to existing sporthub-users records.
 *
 * Note: This performs a scan with a filter. Consider adding a GSI on email
 * for production performance if this becomes a hot path.
 *
 * @param email - User email address
 * @returns User profile record or null if not found
 */
export async function getUserByEmail(email: string): Promise<UserProfileRecord | null> {
  try {
    // Scan for Profile records with matching email
    const allItems = await dynamodb.scanItems(USERS_TABLE, {
      filterExpression: 'sortKey = :profile AND email = :email',
      expressionAttributeValues: {
        ':profile': 'Profile',
        ':email': email,
      },
    });

    if (!allItems || allItems.length === 0) {
      return null;
    }

    // Return first match (should only be one per email)
    return allItems[0] as UserProfileRecord;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
}
