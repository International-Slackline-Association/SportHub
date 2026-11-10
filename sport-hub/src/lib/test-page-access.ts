import { auth } from './auth';
import { redirect } from 'next/navigation';
import { roleHasPermission } from '../types/rbac';

/**
 * Check if user can access test pages
 * Test pages are accessible:
 * - In development mode (any user)
 * - In production mode (User Managers and General admins: Manage Users lives here)
 */
export async function requireTestPageAccess() {
  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return;
  }

  // In production, require admin role
  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  if (!roleHasPermission(session.user.role, 'users:manage')) {
    redirect('/unauthorized');
  }
}

/**
 * Check if user can access test API routes
 * Returns status object instead of redirecting
 */
export async function canAccessTestAPI(): Promise<{
  allowed: boolean;
  reason?: string;
  status?: number;
}> {
  // Allow in development
  if (process.env.NODE_ENV === 'development') {
    return { allowed: true };
  }

  // In production, require admin role
  const session = await auth();

  if (!session) {
    return {
      allowed: false,
      reason: 'Authentication required',
      status: 401,
    };
  }

  if (!roleHasPermission(session.user.role, 'users:manage')) {
    return {
      allowed: false,
      reason: 'User Manager or General admin required',
      status: 403,
    };
  }

  return { allowed: true };
}
