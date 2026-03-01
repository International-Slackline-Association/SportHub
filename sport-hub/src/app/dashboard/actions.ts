'use server';

import { auth } from '@lib/auth';
import { canEditUser } from '@lib/authorization';
import { dynamodb, USERS_TABLE } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import type { UserProfileRecord } from '@lib/relational-types';
import type { UserSubType } from '../../types/rbac';
import { clearRoleCache } from '@lib/rbac-service';

export interface SocialMediaData {
  instagram?: string;
  youtube?: string;
  facebook?: string;
  whatsapp?: string;
  twitch?: string;
  tiktok?: string;
}

export interface ProfileUpdateData {
  name?: string;
  surname?: string;
  email?: string;
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: string;
  socialMedia?: SocialMediaData;
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
    // Convert empty strings to undefined so DynamoDB doesn't store them
    const trimmed = {
      name: data?.name?.trim() || undefined,
      surname: data?.surname?.trim() || undefined,
      email: data?.email?.trim() || undefined,
      country: data?.country?.trim() || undefined,
      city: data?.city?.trim() || undefined,
      birthdate: data?.birthdate?.trim() || undefined,
      gender: data?.gender?.trim() || undefined,
    };

    // Clean social media: trim values, remove empty strings
    const socialMedia = data?.socialMedia ? Object.fromEntries(
      Object.entries(data.socialMedia)
        .map(([k, v]) => [k, v?.trim() || undefined])
        .filter(([, v]) => v)
    ) : undefined;

    const newName = trimmed.name ?? currentUser.name;
    const newSurname = trimmed.surname ?? currentUser.surname;

    // Regenerate athleteSlug when name or surname changes
    const athleteSlug = newName
      ? `${newName}-${newSurname || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/-+$/, '')
      : currentUser.athleteSlug;

    const updatedUser: UserProfileRecord = {
      ...currentUser,
      ...(data?.name !== undefined && { name: trimmed.name }),
      ...(data?.surname !== undefined && { surname: trimmed.surname }),
      ...(data?.email !== undefined && { email: trimmed.email }),
      ...(data?.country !== undefined && { country: trimmed.country }),
      ...(data?.city !== undefined && { city: trimmed.city }),
      ...(data?.birthdate !== undefined && { birthdate: trimmed.birthdate }),
      ...(data?.gender !== undefined && { gender: trimmed.gender }),
      ...(data?.socialMedia !== undefined && { socialMedia: Object.keys(socialMedia || {}).length > 0 ? socialMedia : undefined }),
      ...(athleteSlug && { athleteSlug }),
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
 * Returns name, surname, email, isaUsersId stored in the app database (users table)
 */
export async function getFullUserProfile(userId: string) {
  try {
    const user = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | undefined;
    if (!user) return null;

    return {
      name: user.name || '',
      surname: user.surname || '',
      email: user.email || '',
      isaUsersId: user.isaUsersId || '',
      country: user.country || '',
      city: user.city || '',
      birthdate: user.birthdate || '',
      gender: user.gender || '',
      socialMedia: user.socialMedia,
    };
  } catch (error) {
    console.error('Error fetching full user profile:', error);
    return null;
  }
}

/**
 * Add 'organizer' subtype to the current user's profile and set it as primary.
 * Any authenticated user may call this on their own account.
 */
export async function becomeOrganizer(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Not authenticated');
  }

  const userId = session.user.id;

  const currentUser = await dynamodb.getItem(USERS_TABLE, { userId, sortKey: 'Profile' }) as UserProfileRecord | undefined;

  if (!currentUser) {
    throw new Error('Profile not found. Please save your profile first.');
  }

  const currentSubTypes = (currentUser.userSubTypes || []) as UserSubType[];
  if (currentSubTypes.includes('organizer')) return;

  const updatedUser: UserProfileRecord = {
    ...currentUser,
    userSubTypes: [...currentSubTypes, 'organizer'] as UserSubType[],
    primarySubType: 'organizer',
    lastProfileUpdate: Date.now(),
  };

  await dynamodb.putItem(USERS_TABLE, updatedUser as unknown as Record<string, unknown>);
  clearRoleCache(userId);
  revalidatePath('/dashboard');
}
