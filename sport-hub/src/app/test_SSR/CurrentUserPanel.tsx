'use client';

import type { Session } from 'next-auth';
import type { Role, UserSubType, Permission } from 'src/types/rbac';
import { ROLE_PERMISSIONS } from 'src/types/rbac';

interface DbUser {
  id: string;
  name: string;
  surname?: string;
  email: string;
  role?: Role;
  userSubTypes?: UserSubType[];
  primarySubType?: UserSubType;
}

interface CurrentUserPanelProps {
  session: Session | null;
  dbUser: DbUser | null | undefined;
}

export default function CurrentUserPanel({ session, dbUser }: CurrentUserPanelProps) {
  if (!session) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-yellow-800 mb-2">Not Signed In</h2>
        <p className="text-yellow-700">
          Sign in to see your session and database information.
        </p>
        <a
          href="/auth/signin"
          className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Sign In
        </a>
      </div>
    );
  }

  const sessionRole = session.user.role || 'user';
  const dbRole = dbUser?.role || 'user';
  const roleMismatch = sessionRole !== dbRole;
  const permissions = ROLE_PERMISSIONS[sessionRole] || [];

  return (
    <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <h2 className="text-xl font-semibold text-white">Current User</h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session Info */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              Session Info
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">User ID</dt>
                <dd className="font-mono text-gray-900 text-xs truncate max-w-[200px]" title={session.user.id}>
                  {session.user.id}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{session.user.email}</dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-gray-500">Role</dt>
                <dd>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    sessionRole === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {sessionRole}
                  </span>
                </dd>
              </div>
              {session.user.cognitoSub && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Cognito Sub</dt>
                  <dd className="font-mono text-gray-500 text-xs truncate max-w-[200px]" title={session.user.cognitoSub}>
                    {session.user.cognitoSub}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Database Info */}
          <div>
            <h3 className="font-medium text-gray-700 mb-3 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dbUser ? 'bg-blue-500' : 'bg-red-500'}`}></span>
              Database Record
            </h3>
            {dbUser ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Name</dt>
                  <dd className="text-gray-900">{`${dbUser.name} ${dbUser.surname || ''}`.trim()}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-500">Role</dt>
                  <dd>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      dbRole === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {dbRole}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sub-Types</dt>
                  <dd className="flex gap-1 flex-wrap justify-end">
                    {dbUser.userSubTypes && dbUser.userSubTypes.length > 0 ? (
                      dbUser.userSubTypes.map(st => (
                        <span
                          key={st}
                          className={`px-2 py-0.5 rounded text-xs ${
                            st === dbUser.primarySubType
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {st}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-red-600">
                User not found in database
              </p>
            )}
          </div>
        </div>

        {/* Role Mismatch Warning */}
        {roleMismatch && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Role Mismatch:</strong> Session role ({sessionRole}) differs from database role ({dbRole}).
              Sign out and back in to refresh your session.
            </p>
          </div>
        )}

        {/* Permissions */}
        <div className="mt-6 pt-4 border-t">
          <h3 className="font-medium text-gray-700 mb-3">Permissions</h3>
          {permissions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {permissions.map((perm: Permission) => (
                <span
                  key={perm}
                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono"
                >
                  {perm}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No special permissions. Users can access public content and edit their own profile.
            </p>
          )}
        </div>

        {/* Debug: Full Session */}
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
            View Full Session Object
          </summary>
          <pre className="mt-2 p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-auto max-h-48">
            {JSON.stringify(session, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
