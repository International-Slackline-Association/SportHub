import { NextResponse } from 'next/server';
import { auth } from '@lib/auth';
import { dynamodb, USERS_TABLE } from '@lib/dynamodb';
import { clearRoleCache, getCacheStats } from '@lib/rbac-service';
import type { UserProfileRecord } from '@lib/relational-types';

/**
 * GET /api/debug-rbac
 * Diagnose role mismatch between session and database
 */
export async function GET() {
  try {
    // Get current session
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch user profile from database (fresh, no cache)
    const user = await dynamodb.getItem(USERS_TABLE, {
      userId: session.user.id,
      sortKey: 'Profile'
    }) as UserProfileRecord | null;

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        userId: session.user.id,
        sessionRole: session.user.role,
        help: 'Your user record does not exist in DynamoDB. Visit /dashboard to create it.'
      }, { status: 404 });
    }

    // Check access (dev mode OR admin in session OR admin in DB)
    const isDev = process.env.NODE_ENV === 'development';
    const hasAdminInSession = session.user.role === 'admin';
    const hasAdminInDB = user.role === 'admin';

    if (!isDev && !hasAdminInSession && !hasAdminInDB) {
      return NextResponse.json({
        error: 'Admin access required',
        help: 'This endpoint requires admin role in either your session or database',
        sessionRole: session.user.role,
        databaseRole: user.role
      }, { status: 403 });
    }

    // Get cache statistics
    const cacheStats = getCacheStats();

    // Detect mismatch
    const sessionRole = session.user.role;
    const databaseRole = user.role;
    const mismatch = sessionRole !== databaseRole;

    // Build response
    const response: Record<string, unknown> = {
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      sessionRole,
      databaseRole,
      mismatch,
      cacheStats,
      timestamp: new Date().toISOString(),
    };

    if (mismatch) {
      response.explanation = `Your database role is '${databaseRole}' but your session role is '${sessionRole}'. This happens when your role was changed in the database after your JWT was created. The role may have been cached for up to 5 minutes.`;
      response.fixInstructions = [
        '1. Call POST /api/debug-rbac/clear-cache to clear your role cache',
        '2. Sign out completely from the application',
        '3. Sign back in to get a fresh JWT token',
        `4. Your session will now show '${databaseRole}' role`,
      ];
    } else {
      response.message = 'Your session role matches your database role. No action needed.';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in debug-rbac GET:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/debug-rbac/clear-cache
 * Manually clear role cache for current user
 */
export async function POST() {
  try {
    // Get current session
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Fetch user from database
    const user = await dynamodb.getItem(USERS_TABLE, {
      userId: session.user.id,
      sortKey: 'Profile'
    }) as UserProfileRecord | null;

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        userId: session.user.id,
      }, { status: 404 });
    }

    // Check access (dev mode OR admin in session OR admin in DB)
    const isDev = process.env.NODE_ENV === 'development';
    const hasAdminInSession = session.user.role === 'admin';
    const hasAdminInDB = user.role === 'admin';

    if (!isDev && !hasAdminInSession && !hasAdminInDB) {
      return NextResponse.json({
        error: 'Admin access required',
        help: 'This endpoint requires admin role in either your session or database'
      }, { status: 403 });
    }

    // Clear cache for this user
    clearRoleCache(session.user.id);

    console.log(`[DEBUG-RBAC] Cache cleared for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Role cache cleared for your user',
      userId: session.user.id,
      nextSteps: [
        '1. Sign out from the application (visit /api/auth/signout)',
        '2. Sign back in',
        '3. Your session will reflect your database role',
        '4. Visit /api/debug-rbac to verify the fix',
      ],
    });
  } catch (error) {
    console.error('Error in debug-rbac POST:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
