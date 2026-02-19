'use server'

import { dynamodb } from '@lib/dynamodb';
import { auth } from '@lib/auth';
import { clearRoleCache } from '@lib/rbac-service';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Role, UserSubType } from 'src/types/rbac';

const TABLE_NAME = 'users';

export async function createUser(formData: FormData) {
  const id = formData.get('id') as string;
  const name = (formData.get('name') as string)?.trim();
  const surname = (formData.get('surname') as string)?.trim() || undefined;
  const email = (formData.get('email') as string)?.trim();
  const country = (formData.get('country') as string) || undefined;
  const gender = (formData.get('gender') as string) || undefined;
  const isaId = (formData.get('isaId') as string) || undefined;

  if (!name || !email) {
    throw new Error('Name and email are required fields');
  }

  // Generate ID if not provided
  const userId = id || `athlete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const athleteSlug = `${name}--${surname || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/-+$/, '');

  const user = {
    userId: userId,
    sortKey: 'Profile',
    id: userId,
    name,
    surname,
    email,
    athleteSlug,
    country,
    createdAt: Date.now(),
    gender,
    isaId,
    role: 'user' as Role,
    userSubTypes: ['athlete'] as UserSubType[],
    primarySubType: 'athlete' as UserSubType,
    totalPoints: 0,
    contestCount: 0,
  };

  await dynamodb.putItem(TABLE_NAME, user as unknown as Record<string, unknown>);
  revalidatePath('/test_SSR');
}

export async function updateUser(formData: FormData) {
  const id = formData.get('id') as string;
  const name = (formData.get('name') as string)?.trim();
  const surname = (formData.get('surname') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const country = (formData.get('country') as string) || undefined;
  const city = (formData.get('city') as string)?.trim() || undefined;
  const birthdate = (formData.get('birthdate') as string) || undefined;
  const gender = (formData.get('gender') as string) || undefined;

  if (!id || !name || !email) {
    throw new Error('ID, name and email are required fields');
  }

  // Get existing user first (use composite key)
  const existingUser = await dynamodb.getItem(TABLE_NAME, { userId: id, sortKey: 'Profile' });
  if (!existingUser) {
    throw new Error('User not found');
  }

  const finalSurname = surname || '';
  const athleteSlug = `${name}--${finalSurname}`.toLowerCase().replace(/\s+/g, '-').replace(/-+$/, '');

  const updatedUser = {
    ...existingUser,
    name,
    surname: surname || undefined,
    email,
    country,
    city,
    birthdate,
    gender,
    athleteSlug,
    updatedAt: new Date().toISOString(),
  };

  await dynamodb.putItem(TABLE_NAME, updatedUser as unknown as Record<string, unknown>);
  revalidatePath('/test_SSR');
  redirect('/test_SSR');
}

export async function deleteUser(formData: FormData) {
  const id = formData.get('id') as string;

  if (!id) {
    throw new Error('Missing user ID');
  }

  // Use composite key for deletion
  await dynamodb.deleteItem(TABLE_NAME, { userId: id, sortKey: 'Profile' });
  revalidatePath('/test_SSR');
}

/**
 * Update user role and sub-types
 * Requires admin role in production, any user in development
 */
export async function updateUserRoleAndSubTypes(
  userId: string,
  role: Role,
  userSubTypes: UserSubType[],
  primarySubType?: UserSubType
): Promise<{ success: boolean; message?: string; error?: string }> {
  // Check authorization
  const session = await auth();

  if (!session) {
    return { success: false, error: 'Authentication required' };
  }

  // In production, require admin role
  if (process.env.NODE_ENV === 'production' && session.user.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    // Get existing user (use composite key)
    const existingUser = await dynamodb.getItem(TABLE_NAME, { userId, sortKey: 'Profile' });
    if (!existingUser) {
      return { success: false, error: 'User not found' };
    }

    // Ensure primarySubType is valid
    const validPrimarySubType = primarySubType && userSubTypes.includes(primarySubType)
      ? primarySubType
      : userSubTypes[0];

    const updatedUser = {
      ...existingUser,
      role,
      userSubTypes,
      primarySubType: validPrimarySubType,
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: session.user.id,
    };

    await dynamodb.putItem(TABLE_NAME, updatedUser as unknown as Record<string, unknown>);

    // Clear role cache for this user
    clearRoleCache(userId);

    revalidatePath('/test_SSR');

    const isSelf = userId === session.user.id;
    return {
      success: true,
      message: isSelf
        ? `Updated to ${role}. Sign out and back in to refresh your session.`
        : `User updated to ${role} role.`,
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
