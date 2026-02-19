import { NextResponse } from 'next/server';
import { dynamodb, USERS_TABLE } from '@lib/dynamodb';
import { auth } from '@lib/auth';
import { clearRoleCache } from '@lib/rbac-service';
import type { Role, UserSubType } from 'src/types/rbac';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authorization
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // In production, require admin role
    if (process.env.NODE_ENV === 'production' && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { role, userSubTypes, primarySubType } = await request.json() as {
      role: Role;
      userSubTypes: UserSubType[];
      primarySubType?: UserSubType;
    };

    // Validate role
    if (!['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Get existing user (use composite key)
    const existingUser = await dynamodb.getItem(USERS_TABLE, { userId: id, sortKey: 'Profile' });
    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate primarySubType is in userSubTypes
    const validPrimarySubType = primarySubType && userSubTypes.includes(primarySubType)
      ? primarySubType
      : userSubTypes[0];

    // Update user with new role data
    const updatedUser = {
      ...existingUser,
      role,
      userSubTypes,
      primarySubType: validPrimarySubType,
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: session.user.id,
    };

    await dynamodb.putItem(USERS_TABLE, updatedUser as unknown as Record<string, unknown>);

    // Clear role cache for this user
    clearRoleCache(id);

    const isSelf = id === session.user.id;
    return NextResponse.json({
      success: true,
      message: isSelf
        ? `Updated to ${role}. Sign out and back in to refresh your session.`
        : `User updated to ${role} role.`,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
