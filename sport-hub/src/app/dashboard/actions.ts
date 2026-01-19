'use server';

import { auth } from '@lib/auth';
import { canEditUser } from '@lib/authorization';
import { dynamodb } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import { updateReferenceUser } from '@lib/reference-db-service';
import type { UserProfileRecord } from '@lib/relational-types';

const USERS_TABLE = 'users';

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  country?: string;
}

/**
 * Update user profile
 * Users can only update their own profile, admins can update any profile
 * Note: Profile identity data (name, email, country) is now stored in reference DB
 */
export async function updateProfile(userId: string, data?: ProfileUpdateData) {
  try {
    // Check authorization (ownership or admin)
    const authResult = await canEditUser(userId);

    if (!authResult.authorized) {
      return {
        success: false,
        error: authResult.reason || 'Unauthorized to edit this profile',
      };
    }

    // Get session for audit trail
    const session = await auth();

    // Get current user profile data
    const currentUser = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | undefined;

    // If user doesn't exist, create them (handles users who signed in before migration)
    if (!currentUser) {
      console.log(`User ${userId} not found in database, creating new record`);

      const newUser: UserProfileRecord = {
        userId,
        sortKey: 'Profile',
        role: 'user',
        userSubTypes: ['athlete'],
        primarySubType: 'athlete',
        createdAt: Date.now(),
        totalPoints: 0,
        contestCount: 0,
      };

      await dynamodb.putItem(USERS_TABLE, newUser as unknown as Record<string, unknown>);
      revalidatePath('/dashboard');

      console.log(`Created new user record for ${userId}`);

      return {
        success: true,
        message: 'Profile created successfully',
      };
    }

    // Update existing user with ONLY allowed fields (prevent role escalation)
    // Note: Name, email, country are now stored in reference DB, not app DB
    const updatedUser: UserProfileRecord = {
      ...currentUser,
      lastProfileUpdate: Date.now(),
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser as unknown as Record<string, unknown>);

    // If identity data provided, update reference DB
    if (data && (data.name || data.email || data.country)) {
      await updateReferenceUser(userId, {
        name: data.name,
        email: data.email,
        country: data.country,
      });
    }

    // Revalidate dashboard to show updated data
    revalidatePath('/dashboard');

    console.log(`Profile updated for user ${userId} by ${session?.user?.id || 'unknown'}`);

    return {
      success: true,
      message: 'Profile updated successfully',
    };
  } catch (error) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: 'Failed to update profile. Please try again.',
    };
  }
}

/**
 * Get user profile data
 */
export async function getUserProfile(userId: string) {
  try {
    const user = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | undefined;

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      user: {
        userId: user.userId,
        role: user.role,
        userSubTypes: user.userSubTypes,
        totalPoints: user.totalPoints,
        contestCount: user.contestCount,
      },
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return {
      success: false,
      error: 'Failed to fetch profile',
    };
  }
}
