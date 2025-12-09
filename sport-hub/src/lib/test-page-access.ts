import { auth } from './auth';
import { redirect } from 'next/navigation';

/**
 * Check if user can access test pages
 * Test pages are accessible:
 * - In development mode (any user)
 * - In production mode (admin users only)
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

  if (session.user.role !== 'admin') {
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

  if (session.user.role !== 'admin') {
    return {
      allowed: false,
      reason: 'Admin access required',
      status: 403,
    };
  }

  return { allowed: true };
}
