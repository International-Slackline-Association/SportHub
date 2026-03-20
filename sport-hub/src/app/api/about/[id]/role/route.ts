import { NextResponse } from 'next/server';
import { auth } from '@lib/auth';
import { updateUserRoleAndSubTypes } from '@lib/user-service';
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

    try {
      await updateUserRoleAndSubTypes(id, role, userSubTypes, primarySubType, session.user.id);
    } catch (err) {
      if (err instanceof Error && err.message === 'User not found') {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      throw err;
    }

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
