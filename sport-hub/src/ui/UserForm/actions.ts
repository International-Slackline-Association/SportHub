'use server'

import { auth } from '@lib/auth';
import { revalidatePath } from 'next/cache';
import { invalidateUsersCache } from '@lib/data-services';
import { UserFormValues } from './types';
import type { Role, UserSubType } from 'src/types/rbac';
import { getUser, deleteUser as deleteUserRecord, updateUserRoleAndSubTypes as updateRoleService, saveUserProfile } from '@lib/user-service';
import type { UserProfileRecord } from '@lib/relational-types';

export async function createUser(payload: UserFormValues, path: string) {
  const userId = payload?.id || `athlete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const athleteSlug = `${payload.name}--${payload.surname || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/-+$/, '');

  const user = {
    ...payload,
    userId,
    id: userId,
    sortKey: 'Profile',
    athleteSlug,
    role: 'user' as Role,
    userSubTypes: ['athlete'] as UserSubType[],
    primarySubType: 'athlete' as UserSubType,
    totalPoints: 0,
    contestCount: 0,
    createdAt: Date.now(),
  };

  await saveUserProfile(user as unknown as UserProfileRecord);
  invalidateUsersCache();
  revalidatePath(path);
}

export async function updateUser(formData: FormData) {
  const id = formData.get('id') as string;
  const name = (formData.get('name') as string)?.trim();
  const surname = (formData.get('surname') as string)?.trim() || undefined;
  const email = (formData.get('email') as string)?.trim();
  const country = (formData.get('country') as string) || undefined;
  const city = (formData.get('city') as string)?.trim() || undefined;
  const birthdate = (formData.get('birthdate') as string) || undefined;
  const gender = (formData.get('gender') as string) || undefined;

  if (!id || !name || !email) {
    throw new Error('ID, name and email are required fields');
  }

  const existingUser = await getUser(id);
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

  await saveUserProfile(updatedUser as unknown as UserProfileRecord);
  revalidatePath('/test_SSR');
}

export async function updateUserRoleAndSubTypes(
  userId: string,
  role: Role,
  userSubTypes: UserSubType[],
  primarySubType?: UserSubType
): Promise<{ success: boolean; message?: string; error?: string }> {
  const session = await auth();

  if (!session) {
    return { success: false, error: 'Authentication required' };
  }

  if (process.env.NODE_ENV === 'production' && session.user.role !== 'admin') {
    return { success: false, error: 'Admin access required' };
  }

  try {
    await updateRoleService(userId, role, userSubTypes, primarySubType, session.user.id);
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

export async function deleteUser(formData: FormData) {
  const id = formData.get('id') as string;
  if (!id) throw new Error('Missing user ID');
  await deleteUserRecord(id);
  revalidatePath('/test_SSR');
}
