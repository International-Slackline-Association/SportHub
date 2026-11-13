'use server'

import { auth } from '@lib/auth';
import { assertCanManageUsers, roleChangeError } from '@lib/authorization';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseRoles, rolesLabel, rolesOf, type Role, type UserSubType } from 'src/types/rbac';
import { getUser, deleteUser as deleteUserRecord, updateUserRoleAndSubTypes as updateRoleService, saveUserProfile, generateUniqueAthleteSlug } from '@lib/user-service';
import type { UserProfileRecord } from '@lib/relational-types';

export async function createUser(formData: FormData) {
  await assertCanManageUsers();
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

  const athleteSlug = await generateUniqueAthleteSlug(name, surname);

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
    roles: [] as Role[],
    userSubTypes: ['athlete'] as UserSubType[],
    primarySubType: 'athlete' as UserSubType,
    totalPoints: 0,
    contestCount: 0,
  };

  await saveUserProfile(user as unknown as UserProfileRecord);
  revalidatePath('/admin/users-management');
}

export async function updateUser(formData: FormData) {
  await assertCanManageUsers();
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
  const existingUser = await getUser(id);
  if (!existingUser) {
    throw new Error('User not found');
  }

  const athleteSlug = await generateUniqueAthleteSlug(name, surname, existingUser.userId);

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
  revalidatePath('/admin/users-management');
  redirect('/admin/users-management');
}

export async function deleteUser(formData: FormData) {
  await assertCanManageUsers();
  const id = formData.get('id') as string;

  if (!id) {
    throw new Error('Missing user ID');
  }

  await deleteUserRecord(id);
  revalidatePath('/admin/users-management');
}

/**
 * Update user role and sub-types
 * Requires User Manager (not General Admin changes) or General admin in production, any user in development
 */
export async function updateUserRoleAndSubTypes(
  userId: string,
  requestedRoles: Role[],
  userSubTypes: UserSubType[],
  primarySubType?: UserSubType
): Promise<{ success: boolean; message?: string; error?: string }> {
  // Check authorization
  const session = await auth();

  if (!session) {
    return { success: false, error: 'Authentication required' };
  }

  const roles = parseRoles(requestedRoles);
  if (!roles) {
    return { success: false, error: 'Invalid role' };
  }

  // User Managers may set types and manager roles; only General admins may grant or remove General Admin
  const roleError = roleChangeError(session.user.roles, rolesOf(await getUser(userId)), roles);
  if (roleError) {
    return { success: false, error: roleError };
  }

  try {
    await updateRoleService(userId, roles, userSubTypes, primarySubType, session.user.id);
    revalidatePath('/admin/users-management');

    const isSelf = userId === session.user.id;
    return {
      success: true,
      message: isSelf
        ? `Updated to ${rolesLabel(roles)}. Sign out and back in to refresh your session.`
        : `User updated to ${rolesLabel(roles)}.`,
    };
  } catch (error) {
    console.error('Error updating user role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
