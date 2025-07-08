'use server'

import { dynamodb } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const TABLE_NAME = 'rankings-dev';

export async function createUser(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  if (!id || !name || !email) {
    throw new Error('Missing required fields');
  }

  const user = {
    'rankings-dev-key': id,
    id,
    name,
    email,
    createdAt: new Date().toISOString(),
  };

  await dynamodb.putItem(TABLE_NAME, user);
  revalidatePath('/about_SSR');
}

export async function updateUser(formData: FormData) {
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;

  if (!id || !name || !email) {
    throw new Error('Missing required fields');
  }

  // Get existing user first
  const existingUser = await dynamodb.getItem(TABLE_NAME, { 'rankings-dev-key': id });
  if (!existingUser) {
    throw new Error('User not found');
  }

  const updatedUser = {
    ...existingUser,
    name,
    email,
    updatedAt: new Date().toISOString(),
  };

  await dynamodb.putItem(TABLE_NAME, updatedUser);
  revalidatePath('/about_SSR');
  redirect('/about_SSR');
}

export async function deleteUser(formData: FormData) {
  const id = formData.get('id') as string;

  if (!id) {
    throw new Error('Missing user ID');
  }

  await dynamodb.deleteItem(TABLE_NAME, { 'rankings-dev-key': id });
  revalidatePath('/about_SSR');
}