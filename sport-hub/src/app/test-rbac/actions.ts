'use server';

import { auth } from '@lib/auth';
import { updateUserRole as updateUserRoleService } from '@lib/rbac-service';
import { revalidatePath } from 'next/cache';
import type { Role } from '../../types/rbac';

/**
 * Update user role (development only OR admin in production)
 * Wrapper around rbac-service function with additional authorization checks
 */
export async function updateUserRole(userId: string, newRole: Role) {
  // Check access (dev mode OR admin in production)
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: 'Authentication required',
    };
  }

  if (process.env.NODE_ENV === 'production' && session.user.role !== 'admin') {
    return {
      success: false,
      error: 'Admin access required in production',
    };
  }

  try {
    // Call centralized rbac-service function
    // This will verify the assigner has admin role
    await updateUserRoleService(userId, newRole, session.user.id);

    // Revalidate test page to show updated data
    revalidatePath('/test-rbac');

    console.log(`[TEST-RBAC] Updated user ${userId} role to: ${newRole} by ${session.user.id}`);

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to update role: ${errorMessage}`,
    };
  }
}
