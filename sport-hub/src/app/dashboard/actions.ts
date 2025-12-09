'use server';

import { auth } from '@lib/auth';
import { canEditUser } from '@lib/authorization';
import { dynamodb } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import type { UserRecord } from '@lib/relational-types';

const USERS_TABLE = 'users';

export interface ProfileUpdateData {
  name?: string;
  email?: string;
  country?: string;
}

/**
 * Update user profile
 * Users can only update their own profile, admins can update any profile
 */
export async function updateProfile(userId: string, data: ProfileUpdateData) {
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

    // Get current user data
    const currentUser = await dynamodb.getItem(USERS_TABLE, { userId }) as UserRecord | undefined;

    // If user doesn't exist, create them (handles users who signed in before migration)
    if (!currentUser) {
      console.log(`User ${userId} not found in database, creating new record`);

      const newUser: UserRecord = {
        userId,
        type: 'athlete',
        name: data.name || session?.user?.name || '',
        email: data.email || session?.user?.email || '',
        country: data.country,
        role: 'user',
        roleAssignedAt: new Date().toISOString(),
        roleAssignedBy: 'system',
        createdAt: new Date().toISOString(),
        lastProfileUpdate: new Date().toISOString(),
        profileCompleted: true,
        totalPoints: 0,
        contestsParticipated: 0,
        eventParticipations: [],
      };

      await dynamodb.putItem(USERS_TABLE, newUser);
      revalidatePath('/dashboard');

      console.log(`Created new user record for ${userId}`);

      return {
        success: true,
        message: 'Profile created successfully',
      };
    }

    // Update existing user with new data
    const updatedUser: UserRecord = {
      ...currentUser,
      ...data,
      lastProfileUpdate: new Date().toISOString(),
      profileCompleted: true,
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser);

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
    const user = await dynamodb.getItem(USERS_TABLE, { userId }) as UserRecord | undefined;

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
        name: user.name,
        email: user.email,
        country: user.country,
        role: user.role,
        profileCompleted: user.profileCompleted,
        lastProfileUpdate: user.lastProfileUpdate,
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
