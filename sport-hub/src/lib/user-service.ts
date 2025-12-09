/**
 * User Service
 *
 * Handles user CRUD operations with proper authorization checks
 */

import { dynamodb } from './dynamodb';
import type { UserRecord } from './relational-types';

const USERS_TABLE = 'users';

/**
 * User profile update data (allowed fields only)
 */
export interface UserProfileUpdate {
  name?: string;
  email?: string;
  country?: string;
  // Add other editable fields as needed
}

/**
 * Get user by ID
 *
 * @param userId - Cognito user ID
 * @returns User record or null if not found
 */
export async function getUser(userId: string): Promise<UserRecord | null> {
  try {
    const user = await dynamodb.getItem(USERS_TABLE, { userId }) as UserRecord | null;
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Update user profile (only allowed fields)
 *
 * @param userId - User ID to update
 * @param updates - Fields to update
 * @returns Updated user record
 */
export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<UserRecord> {
  try {
    // Get existing user
    const existingUser = await getUser(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Merge updates (only allow specific fields)
    const updatedUser: UserRecord = {
      ...existingUser,
      ...(updates.name && { name: updates.name }),
      ...(updates.email && { email: updates.email }),
      ...(updates.country && { country: updates.country }),
      lastProfileUpdate: new Date().toISOString(),
    };

    // Save to database
    await dynamodb.putItem(USERS_TABLE, updatedUser);

    return updatedUser;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

/**
 * Create new user (for onboarding)
 *
 * @param cognitoUserId - Cognito user ID (sub claim)
 * @param email - User email
 * @param name - User name
 * @returns Newly created user record
 */
export async function createUser(
  cognitoUserId: string,
  email: string,
  name: string
): Promise<UserRecord> {
  const newUser: UserRecord = {
    userId: cognitoUserId,
    type: 'athlete',      // Default type
    role: 'user',         // Default role
    name,
    email,
    createdAt: new Date().toISOString(),
    totalPoints: 0,
    contestsParticipated: 0,
    eventParticipations: [],
    profileCompleted: false,
    roleAssignedAt: new Date().toISOString(),
    roleAssignedBy: 'system',
  };

  await dynamodb.putItem(USERS_TABLE, newUser);
  console.log(`Created new user: ${cognitoUserId}`);
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
