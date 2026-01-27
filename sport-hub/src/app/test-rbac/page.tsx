import { auth } from '@lib/auth';
import { redirect } from 'next/navigation';
import { dynamodb } from '@lib/dynamodb';
import type { UserProfileRecord } from '@lib/relational-types';
import { getReferenceUsersBatch } from '@lib/reference-db-service';
import RoleManager from './components/RoleManager';
import { requireTestPageAccess } from '@lib/test-page-access';

export default async function TestRBACPage() {
  // Require dev mode OR admin role
  await requireTestPageAccess();

  const session = await auth();

  if (!session) {
    redirect('/auth/signin');
  }

  // Get all user Profile records from database (filter by sortKey)
  const allItems = await dynamodb.scanItems('users');
  const userProfiles = (allItems || []).filter(
    (item): item is UserProfileRecord => item.sortKey === 'Profile'
  );

  // Fetch identity data from reference DB for all users
  // Note: getReferenceUsersBatch expects isaUsersId (ISA_XXXXXXXX), not userId (SportHubID)
  const isaUserIds = userProfiles
    .map(u => u.isaUsersId)
    .filter((id): id is string => Boolean(id));
  const identityMap = await getReferenceUsersBatch(isaUserIds);

  // Combine profile data with identity data for display
  const users = userProfiles.map(profile => {
    const identity = profile.isaUsersId
      ? identityMap.get(profile.isaUsersId)
      : undefined;

    return {
      userId: profile.userId,
      name: identity?.name || profile.athleteSlug?.replace(/-/g, ' ') || 'Unknown',
      email: identity?.email || 'No email',
      role: profile.role,
    };
  });

  // Get current user's combined data
  // Note: session.user.id is Cognito UUID, but userId in DB is custom ID (ISA_XXXXXXXX)
  // So we match by email instead
  const currentUser = users.find(u => u.email === session.user.email);

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">RBAC Test Page</h1>
          <p className="text-red-600 font-medium mt-2">
            ⚠️ Development Only - This page is not available in production
          </p>
        </div>

        {/* Current Session Info */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Current Session</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Cognito User ID (from session)</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                {session.user.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Name (from database)</dt>
              <dd className="mt-1 text-sm text-gray-900">{currentUser?.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email (from session)</dt>
              <dd className="mt-1 text-sm text-gray-900">{session.user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role (from database)</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    currentUser?.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {session.user.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role (from session)</dt>
              <dd className="mt-1">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    session.user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {currentUser?.role || 'Not in database'}
                </span>
              </dd>
            </div>
          </dl>

          {currentUser?.role !== session.user.role && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
              <p className="font-medium">⚠️ Role Mismatch Detected</p>
              <p className="text-sm mt-1">
                Your database role differs from your session role. You may need to sign out and
                sign back in to refresh your session.
              </p>
            </div>
          )}
        </div>

        {/* User Role Management */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">User Role Management</h2>
          <p className="text-sm text-gray-600 mb-4">
            Update user roles below. Changes to your own role require re-login to take effect.
          </p>
          <RoleManager users={users} currentUserId={session.user.id} />
        </div>

        {/* Full Session Debug */}
        <div className="bg-white shadow rounded-lg p-6 mt-6">
          <details>
            <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
              View Full Session Object
            </summary>
            <pre className="mt-4 bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(session, null, 2)}
            </pre>
          </details>
        </div>

        {/* Current User DB Record */}
        {currentUser && (
          <div className="bg-white shadow rounded-lg p-6 mt-6">
            <details>
              <summary className="cursor-pointer text-gray-600 hover:text-gray-800 font-medium">
                View Current User Database Record
              </summary>
              <pre className="mt-4 bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-xs">
                {JSON.stringify(currentUser, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
