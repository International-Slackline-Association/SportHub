/**
 * User Service
 *
 * Handles user CRUD operations with proper authorization checks
 */

import { dynamodb } from './dynamodb';
import type { UserRecord } from './relational-types';
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
 * Updates identity data in reference DB (isa-users table)
 *
 * @param userId - Custom user ID (e.g., "ISA_FBE8B254")
 * @param updates - Fields to update
 * @returns Updated user record from app DB
 */
export async function updateUserProfile(
  userId: string,
  updates: UserProfileUpdate
): Promise<UserRecord> {
  try {
    // Get existing user from app DB
    const existingUser = await getUser(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }

    // Update identity data in reference DB
    await updateReferenceUser(userId, updates);

    // Update app DB metadata
    const updatedUser: UserRecord = {
      ...existingUser,
      lastProfileUpdate: new Date().toISOString(),
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser);

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
): Promise<UserRecord> {
  const newUser: UserRecord = {
    userId: customUserId,  // Custom ID from reference DB
    role: 'user',          // Default role
    userSubTypes: [],      // Sub-types (athlete, judge, organizer) - can be assigned later
    primarySubType: 'athlete',  // Default primary type for GSI
    createdAt: new Date().toISOString(),
    totalPoints: 0,
    contestsParticipated: 0,
    contestParticipations: [],  // RENAMED from eventParticipations
    profileCompleted: false,
    roleAssignedAt: new Date().toISOString(),
    roleAssignedBy: 'system',
  };

  await dynamodb.putItem(USERS_TABLE, newUser);
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
