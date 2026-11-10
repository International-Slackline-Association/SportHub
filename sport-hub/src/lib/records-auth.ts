import { auth } from './auth';
import { roleHasPermission, type Permission } from 'src/types/rbac';

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) throw new Error('You need to be signed in');
  return session;
}

/** General admins always pass; otherwise the role must grant the permission (Record Manager has records:review and records:manage). */
export async function requireRecordsPermission(permission: Permission) {
  const session = await requireSession();
  const allowed = roleHasPermission(session.user.role, permission);
  if (!allowed) throw new Error(`Missing permission ${permission}`);
  return session;
}

/** Like requireRecordsPermission, without throwing. */
export const hasRecordsPermission = (session: Awaited<ReturnType<typeof requireSession>>, permission: Permission) =>
  roleHasPermission(session.user.role, permission);

export const actorOf = (session: Awaited<ReturnType<typeof requireSession>>) => ({
  byUserId: session.user.id,
  byName: session.user.name ?? session.user.email ?? undefined,
});
