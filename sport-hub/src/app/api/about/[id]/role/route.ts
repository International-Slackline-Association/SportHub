import { NextResponse } from 'next/server';
import { auth } from '@lib/auth';
import { getUser, updateUserRoleAndSubTypes } from '@lib/user-service';
import { roleChangeError } from '@lib/authorization';
import { isRole, parseAdminRoles, rolesLabel, rolesOf, type AdminRole, type Role, type UserSubType } from 'src/types/rbac';

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
    const body = await request.json() as {
      roles?: AdminRole[];
      role?: Role;              // Legacy single role
      userSubTypes: UserSubType[];
      primarySubType?: UserSubType;
    };
    const { userSubTypes, primarySubType } = body;
    const roles = body.roles !== undefined
      ? parseAdminRoles(body.roles)
      : isRole(body.role) ? (body.role === 'user' ? [] : [body.role]) : null;

    // Validate roles
    if (!roles) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // User Managers may set types and manager roles; only General admins may grant or remove General Admin
    const roleError = roleChangeError(session.user.roles, rolesOf(await getUser(id)), roles);
    if (roleError) {
      return NextResponse.json({ error: roleError }, { status: 403 });
    }

    try {
      await updateUserRoleAndSubTypes(id, roles, userSubTypes, primarySubType, session.user.id);
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
        ? `Updated to ${rolesLabel(roles)}. Sign out and back in to refresh your session.`
        : `User updated to ${rolesLabel(roles)}.`,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
