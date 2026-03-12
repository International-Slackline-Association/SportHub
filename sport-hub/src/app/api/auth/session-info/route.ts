import { NextResponse } from 'next/server';
import { auth } from '@lib/auth';
import { getUser } from '@lib/user-service';
import { ROLE_PERMISSIONS } from 'src/types/rbac';
import type { Role, UserSubType } from 'src/types/rbac';

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ session: null, dbUser: null });
    }

    // Get user from database
    let dbUser = null;
    if (session.user.id) {
      const user = await getUser(session.user.id);

      if (user) {
        dbUser = {
          id: user.userId,
          name: (user.name ?? user.athleteSlug ?? '') as string,
          surname: (user.surname ?? '') as string,
          email: (user.email ?? '') as string,
          isaUsersId: (user.isaUsersId ?? '') as string,
          country: (user.country ?? '') as string,
          city: (user.city ?? '') as string,
          birthdate: (user.birthdate ?? '') as string,
          gender: (user.gender ?? '') as string,
          role: (user.role as Role) ?? 'user',
          userSubTypes: (user.userSubTypes as UserSubType[]) ?? [],
          primarySubType: user.primarySubType as UserSubType | undefined,
        };
      }
    }

    const sessionRole = session.user.role || 'user';
    const permissions = ROLE_PERMISSIONS[sessionRole] || [];

    return NextResponse.json({
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          role: sessionRole,
          cognitoSub: session.user.cognitoSub,
          permissions,
        },
      },
      dbUser,
    });
  } catch (error) {
    console.error('Error fetching session info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
