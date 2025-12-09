'use server';

import { dynamodb } from '@lib/dynamodb';
import { revalidatePath } from 'next/cache';
import type { UserRecord } from '@lib/relational-types';
import type { Role } from '../../types/rbac';

const USERS_TABLE = 'users';

/**
 * Update user role (development only OR admin in production)
 * Test functions are accessible in dev mode OR by admins in production
 */
export async function updateUserRole(userId: string, newRole: Role) {
  // Check access (dev mode OR admin)
  if (process.env.NODE_ENV === 'production') {
    const { auth } = await import('@lib/auth');
    const session = await auth();

    if (!session || session.user.role !== 'admin') {
      return {
        success: false,
        error: 'Admin access required',
      };
    }
  }

  try {
    // Get current user data
    const currentUser = (await dynamodb.getItem(USERS_TABLE, { userId })) as
      | UserRecord
      | undefined;

    if (!currentUser) {
      return {
        success: false,
        error: 'User not found in database',
      };
    }

    // Update user with new role
    const updatedUser: UserRecord = {
      ...currentUser,
      role: newRole,
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: 'test-rbac-page',
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser);

    // Revalidate test page to show updated data
    revalidatePath('/test-rbac');

    console.log(`[TEST-RBAC] Updated user ${userId} role to: ${newRole}`);

    return {
      success: true,
      message: `Role updated to ${newRole}. ${
        newRole === 'admin'
          ? 'User now has admin privileges.'
          : 'User privileges reverted to standard user.'
      }`,
    };
  } catch (error) {
    console.error('[TEST-RBAC] Error updating user role:', error);
    return {
      success: false,
      error: 'Failed to update role. Check server logs for details.',
    };
  }
}
