'use server';

import { auth } from '@lib/auth';
import { canEditUser } from '@lib/authorization';
import { dynamodb } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import type { UserProfileRecord } from '@lib/relational-types';

const USERS_TABLE = 'users';

export interface ProfileUpdateData {
  name?: string;
  surname?: string;
  email?: string;
  country?: string;
}

/**
 * Update user profile
 * Users can only update their own profile, admins can update any profile
 * Identity data (name, surname, email) is written to SportHub DB (users table).
 * TODO: Also sync to reference DB (isa-users) - not yet implemented.
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
    // Identity data (name, surname, email) is stored in the SportHub DB (users table)
    const updatedUser: UserProfileRecord = {
      ...currentUser,
      ...(data?.name !== undefined && { name: data.name }),
      ...(data?.surname !== undefined && { surname: data.surname }),
      ...(data?.email !== undefined && { email: data.email }),
      lastProfileUpdate: Date.now(),
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser as unknown as Record<string, unknown>);

    // TODO: Also sync identity changes to reference DB (isa-users table) once
    //       a sync mechanism is implemented. For now, edits only go to SportHub DB.

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
 * Get user profile data (role, stats only)
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

/**
 * Get full user profile including identity fields from SportHub DB
 * Returns name, surname, email stored in the app database (users table)
 */
export async function getFullUserProfile(userId: string) {
  try {
    const user = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | undefined;
    if (!user) return null;

    return {
      name: user.name || '',
      surname: user.surname || '',
      email: user.email || '',
    };
  } catch (error) {
    console.error('Error fetching full user profile:', error);
    return null;
  }
}
