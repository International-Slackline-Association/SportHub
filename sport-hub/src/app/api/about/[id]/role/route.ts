import { NextResponse } from 'next/server';
import { auth } from '@lib/auth';
import { getUser, updateUserRoleAndSubTypes } from '@lib/user-service';
import { roleChangeError } from '@lib/authorization';
import { isRole, type Role, type UserSubType } from 'src/types/rbac';

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

    const { id } = await params;
    const { role, userSubTypes, primarySubType } = await request.json() as {
      role: Role;
      userSubTypes: UserSubType[];
      primarySubType?: UserSubType;
    };

    // Validate role
    if (!isRole(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // User Managers may change user types; only General admins may change the role
    const roleError = roleChangeError(session.user.role, (await getUser(id))?.role as Role | undefined, role);
    if (roleError) {
      return NextResponse.json({ error: roleError }, { status: 403 });
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
