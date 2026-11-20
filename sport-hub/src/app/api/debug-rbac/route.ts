import { NextResponse } from 'next/server';
import { auth } from '@lib/auth';
import { getUser } from '@lib/user-service';
import { clearRoleCache, getCacheStats } from '@lib/rbac-service';
import { isGeneralAdmin, rolesLabel, rolesOf } from 'src/types/rbac';

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
    const user = await getUser(session.user.id);

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        userId: session.user.id,
        sessionRoles: session.user.roles,
        help: 'Your user record does not exist in DynamoDB. Visit /dashboard to create it.'
      }, { status: 404 });
    }

    // Check access (dev mode OR admin in session OR admin in DB)
    const isDev = process.env.NODE_ENV === 'development';
    const hasAdminInSession = isGeneralAdmin(session.user.roles);
    const hasAdminInDB = isGeneralAdmin(rolesOf(user));

    if (!isDev && !hasAdminInSession && !hasAdminInDB) {
      return NextResponse.json({
        error: 'Admin access required',
        help: 'This endpoint requires General Admin in either your session or database',
        sessionRoles: session.user.roles,
        databaseRoles: rolesOf(user)
      }, { status: 403 });
    }

    // Get cache statistics
    const cacheStats = getCacheStats();

    // Detect mismatch
    const sessionRoles = rolesLabel(session.user.roles);
    const databaseRoles = rolesLabel(rolesOf(user));
    const mismatch = sessionRoles !== databaseRoles;

    // Build response
    const response: Record<string, unknown> = {
      userId: session.user.id,
      userName: session.user.name,
      userEmail: session.user.email,
      sessionRoles,
      databaseRoles,
      mismatch,
      cacheStats,
      timestamp: new Date().toISOString(),
    };

    if (mismatch) {
      response.explanation = `Your database roles are '${databaseRoles}' but your session roles are '${sessionRoles}'. This happens when your roles were changed in the database after your JWT was created. Roles may have been cached for up to 5 minutes.`;
      response.fixInstructions = [
        '1. Call POST /api/debug-rbac/clear-cache to clear your role cache',
        '2. Sign out completely from the application',
        '3. Sign back in to get a fresh JWT token',
        `4. Your session will now show '${databaseRoles}'`,
      ];
    } else {
      response.message = 'Your session roles match your database roles. No action needed.';
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
    const user = await getUser(session.user.id);

    if (!user) {
      return NextResponse.json({
        error: 'User not found in database',
        userId: session.user.id,
      }, { status: 404 });
    }

    // Check access (dev mode OR admin in session OR admin in DB)
    const isDev = process.env.NODE_ENV === 'development';
    const hasAdminInSession = isGeneralAdmin(session.user.roles);
    const hasAdminInDB = isGeneralAdmin(rolesOf(user));

    if (!isDev && !hasAdminInSession && !hasAdminInDB) {
      return NextResponse.json({
        error: 'Admin access required',
        help: 'This endpoint requires General Admin in either your session or database'
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
        '3. Your session will reflect your database roles',
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
