import { auth } from './auth';
import type { Permission } from 'src/types/rbac';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('You need to be signed in');
  return session;
}

/** Admins always pass; otherwise the permission must be on the session (records:review / records:manage). */
export async function requireRecordsPermission(permission: Permission) {
  const session = await requireSession();
  const allowed = session.user.role === 'admin' || session.user.permissions?.includes(permission);
  if (!allowed) throw new Error(`Missing permission ${permission}`);
  return session;
}

/** Like requireRecordsPermission, without throwing. */
export const hasRecordsPermission = (session: Awaited<ReturnType<typeof requireSession>>, permission: Permission) =>
  session.user.role === 'admin' || !!session.user.permissions?.includes(permission);

export const actorOf = (session: Awaited<ReturnType<typeof requireSession>>) => ({
  byUserId: session.user.id,
  byName: session.user.name ?? session.user.email ?? undefined,
});
