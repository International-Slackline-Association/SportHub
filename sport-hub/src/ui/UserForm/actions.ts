'use server'

import { dynamodb } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import { UserFormValues } from './types';

const TABLE_NAME = 'users';

export async function createUser(payload: UserFormValues, path: string) {

  // Generate ID if not provided
  const userId = payload?.id || `athlete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const user = {
    ...payload,
    userId: userId,
    id: userId,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.putItem(TABLE_NAME, user as unknown as Record<string, unknown>);
  revalidatePath(path);
}

export async function updateUser(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const country = formData.get('country') as string;

  if (!id || !name || !email) {
    throw new Error('ID, name and email are required fields');
  }

  // Get existing user first
  const existingUser = await dynamodb.getItem(TABLE_NAME, { userId: id });
  if (!existingUser) {
    throw new Error('User not found');
  }

  const updatedUser = {
    ...existingUser,
    name,
    email,
    country: country || existingUser.country,
    updatedAt: new Date().toISOString(),
  };

  await dynamodb.putItem(TABLE_NAME, updatedUser as unknown as Record<string, unknown>);
  // revalidatePath('/test_SSR');
  // redirect('/test_SSR');
}

export async function deleteUser(formData: FormData) {
  const id = formData.get('id') as string;

  if (!id) {
    throw new Error('Missing user ID');
  }

  await dynamodb.deleteItem(TABLE_NAME, { userId: id });
    revalidatePath('/about_SSR');
}