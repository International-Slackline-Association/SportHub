"use client"

import { useEffect, useState, useCallback, useRef } from 'react';
import { FormikHelpers, type FormikProps } from 'formik';
import { Button, Dialog } from '@slacklineinternational/onsight/react';
import { UpdateUserForm } from '@ui/UserForm';
import { ROLES, ROLE_LABELS, rolesLabel, type Role } from 'src/types/rbac';

interface FormValues {
  id: string;
  name: string;
  surname: string;
  gender: string;
  email: string;
  country?: string;
  city?: string;
  birthdate?: string;
  isaId?: string;
}

const DEFAULT_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 250, 500, 1000];
const ALL_SUB_TYPES = ['athlete', 'judge', 'organizer'] as const;

type UserSubType = 'athlete' | 'judge' | 'organizer';
type Permission = string;

interface User {
  createdAt: string;
  id: string;
  name: string;
  surname?: string;
  email: string;
  isaUsersId?: string;
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: string;
  totalPoints?: number;
  contestsParticipated?: number;
  updatedAt?: string;
  roles?: Role[];
  userSubTypes?: UserSubType[];
  primarySubType?: UserSubType;
}

interface SessionInfo {
  user: {
    id: string;
    email: string;
    roles: Role[];
    cognitoSub?: string;
    permissions: Permission[];
  };
}

interface DbUser {
  id: string;
  name: string;
  surname?: string;
  email: string;
  isaUsersId?: string;
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: string;
  roles?: Role[];
  userSubTypes: UserSubType[];
  primarySubType?: UserSubType;
}

type NewUserForm = Omit<User, 'createdAt' | 'totalPoints' | 'contestsParticipated' | 'updatedAt' | 'roles' | 'userSubTypes' | 'primarySubType'>;

export default function TestCSRPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<NewUserForm>({ id: '', name: '', email: '', country: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingRoleUser, setEditingRoleUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Session info
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Role editing state
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [selectedSubTypes, setSelectedSubTypes] = useState<UserSubType[]>([]);
  const [primarySubType, setPrimarySubType] = useState<UserSubType | undefined>();

  // Edit form ref
  const formRef = useRef<FormikProps<FormValues>>(null);

  // Fetch session info
  const fetchSessionInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session-info');
      const data = await response.json();
      setSession(data.session);
      setDbUser(data.dbUser);
    } catch (error) {
      console.error('Error fetching session:', error);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async (cursor?: string | null, append = false, limit = DEFAULT_PAGE_SIZE, search = '') => {
    if (append) {
      setLoadingMore(true);
    } else {
      setFetchingUsers(true);
    }
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (cursor) {
        params.set('cursor', cursor);
      }
      if (search) {
        params.set('search', search);
      }
      const response = await fetch(`/api/about?${params.toString()}`);
      const data = await response.json();

      if (data.users && Array.isArray(data.users)) {
        if (append) {
          setUsers(prev => [...prev, ...data.users]);
        } else {
          setUsers(data.users);
          if (data.totalCount !== undefined) {
            setTotalCount(data.totalCount);
          }
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      } else {
        console.error('API returned invalid data:', data);
        if (!append) {
          setUsers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (!append) {
        setUsers([]);
      }
    } finally {
      setFetchingUsers(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    setIsHydrated(true);
    fetchSessionInfo();
    fetchUsers(null, false, DEFAULT_PAGE_SIZE, searchQuery);
  }, [fetchUsers, fetchSessionInfo, searchQuery]);

  const loadMore = (customLimit?: number) => {
    if (nextCursor && !loadingMore) {
      fetchUsers(nextCursor, true, customLimit ?? pageSize, searchQuery);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setSearchQuery(searchInput.trim());
    setNextCursor(null);
    setHasMore(false);
    setTimeout(() => setIsSearching(false), 100);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setNextCursor(null);
    setHasMore(false);
  };

  const decrementPageSize = () => {
    const currentIndex = PAGE_SIZE_OPTIONS.indexOf(pageSize);
    if (currentIndex > 0) {
      setPageSize(PAGE_SIZE_OPTIONS[currentIndex - 1]);
    }
  };

  const incrementPageSize = () => {
    const currentIndex = PAGE_SIZE_OPTIONS.indexOf(pageSize);
    if (currentIndex < PAGE_SIZE_OPTIONS.length - 1) {
      setPageSize(PAGE_SIZE_OPTIONS[currentIndex + 1]);
    }
  };

  const resetAndFetch = useCallback(() => {
    setNextCursor(null);
    setHasMore(false);
    fetchUsers();
  }, [fetchUsers]);

  const createUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userToCreate: User = {
        ...newUser,
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userToCreate),
      });

      if (response.ok) {
        setNewUser({ id: '', name: '', email: '', country: '' });
        resetAndFetch();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFormSubmit = async (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/about/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name.trim(),
          surname: values.surname.trim() || undefined,
          email: values.email.trim(),
          country: values.country || undefined,
          city: values.city?.trim() || undefined,
          birthdate: values.birthdate || undefined,
          gender: values.gender || undefined,
        }),
      });

      if (response.ok) {
        setEditingUser(null);
        resetAndFetch();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (typeof window !== 'undefined' && !confirm('Are you sure you want to delete this user?')) return;

    try {
      await fetch(`/api/about/${id}`, { method: 'DELETE' });
      resetAndFetch();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const startEditing = (user: User) => {
    setEditingUser({ ...user });
  };

  const cancelEditing = () => {
    setEditingUser(null);
  };

  const startEditingRole = (user: User) => {
    setEditingRoleUser(user);
    setSelectedRoles(user.roles ?? []);
    setSelectedSubTypes(user.userSubTypes || []);
    setPrimarySubType(user.primarySubType);
    setMessage(null);
  };

  const handleSubTypeToggle = (subType: UserSubType) => {
    setSelectedSubTypes(prev => {
      if (prev.includes(subType)) {
        const newSubTypes = prev.filter(st => st !== subType);
        if (primarySubType === subType) {
          setPrimarySubType(newSubTypes[0]);
        }
        return newSubTypes;
      } else {
        const newSubTypes = [...prev, subType];
        if (!primarySubType) {
          setPrimarySubType(subType);
        }
        return newSubTypes;
      }
    });
  };

  const saveRoleChanges = async () => {
    if (!editingRoleUser) return;
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/about/${editingRoleUser.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: selectedRoles,
          userSubTypes: selectedSubTypes,
          primarySubType: primarySubType && selectedSubTypes.includes(primarySubType) ? primarySubType : selectedSubTypes[0],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Role updated successfully' });
        setTimeout(() => {
          setEditingRoleUser(null);
          resetAndFetch();
          fetchSessionInfo(); // Refresh session info too
        }, 1000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update role' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' });
      console.error('Error updating role:', error);
    } finally {
      setLoading(false);
    }
  };

  const isCurrentUser = (userId: string) => session?.user?.id === userId;

  if (!isHydrated) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Users Management (CSR)</h1>
        <div className="bg-default p-6 rounded-lg shadow-md mb-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sessionRole = rolesLabel(session?.user?.roles);
  const dbRole = rolesLabel(dbUser?.roles);
  const roleMismatch = session && dbUser && sessionRole !== dbRole;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Users Management (CSR)</h1>
        <span className="text-xs bg-status-warning-bg text-status-warning-fg px-2 py-1 rounded">
          {process.env.NODE_ENV === 'development' ? 'Dev Mode' : 'Admin Only'}
        </span>
      </div>

      {/* Current User Panel */}
      <div className="bg-default rounded-lg shadow-md mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-action-primary-bg to-action-primary-bg-hover px-6 py-4">
          <h2 className="text-xl font-semibold text-inverse">Current User</h2>
        </div>

        <div className="p-6">
          {sessionLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-1/3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          ) : !session ? (
            <div className="text-center py-4">
              <p className="text-default mb-3">Not signed in</p>
              <a
                href="/auth/signin"
                className="inline-block px-4 py-2 bg-action-primary-bg text-inverse rounded hover:bg-action-primary-bg-hover"
              >
                Sign In
              </a>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Session Info */}
                <div>
                  <h3 className="font-medium text-default mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-action-primary-bg rounded-full"></span>
                    Session Info
                  </h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted">User ID</dt>
                      <dd className="font-mono text-default text-xs truncate max-w-[200px]" title={session.user.id}>
                        {session.user.id}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted">Email</dt>
                      <dd className="text-default">{session.user.email}</dd>
                    </div>
                    <div className="flex justify-between items-center">
                      <dt className="text-muted">Role</dt>
                      <dd>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          !!session?.user?.roles?.length
                            ? 'bg-category-purple-bg text-category-purple-fg'
                            : 'bg-muted text-default'
                        }`}>
                          {sessionRole}
                        </span>
                      </dd>
                    </div>
                    {session.user.cognitoSub && (
                      <div className="flex justify-between">
                        <dt className="text-muted">Cognito Sub</dt>
                        <dd className="font-mono text-muted text-xs truncate max-w-[200px]" title={session.user.cognitoSub}>
                          {session.user.cognitoSub}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {/* Database Info */}
                <div>
                  <h3 className="font-medium text-default mb-3 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${dbUser ? 'bg-action-primary-bg' : 'bg-action-danger-bg'}`}></span>
                    Database Record
                  </h3>
                  {dbUser ? (
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted">Name</dt>
                        <dd className="text-default">{`${dbUser.name} ${dbUser.surname || ''}`.trim()}</dd>
                      </div>
                      {dbUser.isaUsersId && (
                        <div className="flex justify-between">
                          <dt className="text-muted">ISA User ID</dt>
                          <dd className="font-mono text-default text-xs">{dbUser.isaUsersId}</dd>
                        </div>
                      )}
                      {dbUser.country && (
                        <div className="flex justify-between">
                          <dt className="text-muted">Country</dt>
                          <dd className="text-default">{dbUser.country}</dd>
                        </div>
                      )}
                      {dbUser.city && (
                        <div className="flex justify-between">
                          <dt className="text-muted">City</dt>
                          <dd className="text-default">{dbUser.city}</dd>
                        </div>
                      )}
                      {dbUser.birthdate && (
                        <div className="flex justify-between">
                          <dt className="text-muted">Birthdate</dt>
                          <dd className="text-default">{dbUser.birthdate}</dd>
                        </div>
                      )}
                      {dbUser.gender && (
                        <div className="flex justify-between">
                          <dt className="text-muted">Gender</dt>
                          <dd className="text-default capitalize">{dbUser.gender}</dd>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <dt className="text-muted">Role</dt>
                        <dd>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            !!dbUser?.roles?.length
                              ? 'bg-category-purple-bg text-category-purple-fg'
                              : 'bg-muted text-default'
                          }`}>
                            {dbRole}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted">Sub-Types</dt>
                        <dd className="flex gap-1 flex-wrap justify-end">
                          {dbUser.userSubTypes && dbUser.userSubTypes.length > 0 ? (
                            dbUser.userSubTypes.map(st => (
                              <span
                                key={st}
                                className={`px-2 py-0.5 rounded text-xs ${
                                  st === dbUser.primarySubType
                                    ? 'bg-status-success-bg text-success'
                                    : 'bg-muted text-default'
                                }`}
                              >
                                {st}
                              </span>
                            ))
                          ) : (
                            <span className="text-muted">None</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-danger">User not found in database</p>
                  )}
                </div>
              </div>

              {/* Role Mismatch Warning */}
              {roleMismatch && (
                <div className="mt-4 bg-status-warning-bg border border-strong rounded-lg p-4">
                  <p className="text-sm text-status-warning-fg">
                    <strong>Role Mismatch:</strong> Session roles ({sessionRole}) differ from database roles ({dbRole}).
                    Sign out and back in to refresh your session.
                  </p>
                </div>
              )}

              {/* Permissions */}
              <div className="mt-6 pt-4 border-t">
                <h3 className="font-medium text-default mb-3">Permissions</h3>
                {session.user.permissions && session.user.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {session.user.permissions.map((perm: Permission) => (
                      <span
                        key={perm}
                        className="px-2 py-1 bg-status-info-bg text-link rounded text-xs font-mono"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    No special permissions. Users can access public content and edit their own profile.
                  </p>
                )}
              </div>

              {/* Debug: Full Session */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-muted hover:text-default">
                  View Full Session Object
                </summary>
                <pre className="mt-2 p-3 bg-inverse text-inverse rounded text-xs overflow-auto max-h-48">
                  {JSON.stringify({ session, dbUser }, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      </div>

      {/* Add User Form */}
      <div className="bg-default p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        <form onSubmit={createUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="User ID (optional)"
              value={newUser.id}
              onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
              className="border border-default p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
            />
            <input
              type="text"
              placeholder="Name *"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="border border-default p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
              required
            />
            <input
              type="email"
              placeholder="Email *"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border border-default p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
              required
            />
            <input
              type="text"
              placeholder="Country"
              value={newUser.country || ''}
              onChange={(e) => setNewUser({ ...newUser, country: e.target.value })}
              className="border border-default p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-action-primary-bg text-inverse px-6 py-3 rounded-md hover:bg-action-primary-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Adding...' : 'Add User'}
          </button>
        </form>
      </div>

      {/* Edit User Modal */}
      <Dialog
        actions={
          <>
            <Button type="button" variant="neutral" onClick={cancelEditing}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={() => formRef.current?.submitForm()}>
              Save
            </Button>
          </>
        }
        onClose={cancelEditing}
        open={!!editingUser}
        title="Edit User"
      >
        {editingUser && (
          <UpdateUserForm
            user={editingUser}
            onSubmit={handleEditFormSubmit}
            showSubmitButton={false}
            formRef={formRef}
          />
        )}
      </Dialog>

      {/* Role Management Modal */}
      <Dialog
        actions={
          <>
            <Button type="button" variant="neutral" onClick={() => setEditingRoleUser(null)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" loading={loading} onClick={saveRoleChanges}>
              {loading ? 'Saving…' : 'Save Changes'}
            </Button>
          </>
        }
        onClose={() => setEditingRoleUser(null)}
        open={!!editingRoleUser}
        title="Manage Roles & Types"
      >
        {editingRoleUser && (
          <div className="space-y-6">
            {message && (
              <div className={`px-4 py-3 rounded ${
                message.type === 'success'
                  ? 'bg-status-success-bg border border-default text-success'
                  : 'bg-status-danger-bg border border-danger text-danger'
              }`}>
                {message.text}
              </div>
            )}

            {/* User Info */}
            <div className="pb-4 border-b">
              <p className="font-medium">{`${editingRoleUser.name} ${editingRoleUser.surname || ''}`.trim()}</p>
              <p className="text-sm text-muted">{editingRoleUser.email}</p>
              {isCurrentUser(editingRoleUser.id) && (
                <p className="text-xs text-link mt-1">
                  This is your account. Role changes require re-login.
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-default mb-2">
                Role (Authorization)
              </label>
              <div className="space-y-2">
                {ROLES.map(role => {
                  // General Admin includes all other roles: they show as ticked and locked while it is ticked
                  const isIncludedByGeneralAdmin = role !== 'admin' && selectedRoles.includes('admin');
                  return (
                  <label key={role} className={`flex items-center gap-3 p-3 rounded-lg border border-default ${isIncludedByGeneralAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={isIncludedByGeneralAdmin || selectedRoles.includes(role)}
                      disabled={isIncludedByGeneralAdmin}
                      onChange={() => setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : ROLES.filter(r => r === role || prev.includes(r)))}
                      className="w-4 h-4 text-category-purple-fg rounded"
                    />
                    <span className="font-medium">{ROLE_LABELS[role]}</span>
                  </label>
                  );
                })}
              </div>
            </div>

            {/* Sub-Types Selection */}
            <div>
              <label className="block text-sm font-medium text-default mb-2">
                User Types (Classification)
              </label>
              <div className="space-y-2">
                {ALL_SUB_TYPES.map(subType => (
                  <label
                    key={subType}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSubTypes.includes(subType)
                        ? 'border-default bg-status-success-bg'
                        : 'border-default hover:border-strong'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSubTypes.includes(subType)}
                        onChange={() => handleSubTypeToggle(subType)}
                        className="w-4 h-4 text-success rounded"
                      />
                      <span className="capitalize font-medium">{subType}</span>
                    </div>
                    {selectedSubTypes.includes(subType) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPrimarySubType(subType);
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          primarySubType === subType
                            ? 'bg-action-primary-bg text-inverse'
                            : 'bg-muted text-default hover:bg-muted'
                        }`}
                      >
                        {primarySubType === subType ? 'Primary' : 'Set Primary'}
                      </button>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted mt-2">
                Sub-types are for classification only, not authorization.
              </p>
            </div>

          </div>
        )}
      </Dialog>

      {/* Search */}
      <div className="bg-default p-4 rounded-lg shadow-md mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-default p-3 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-border-focus"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            disabled={fetchingUsers || isSearching}
            className="bg-action-primary-bg text-inverse px-6 py-3 rounded-md hover:bg-action-primary-bg disabled:opacity-50 transition-colors"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="bg-muted text-default px-4 py-3 rounded-md hover:bg-muted transition-colors"
            >
              Clear
            </button>
          )}
        </form>
        {searchQuery && (
          <p className="mt-2 text-sm text-default">
            Searching for: <span className="font-medium">&quot;{searchQuery}&quot;</span>
          </p>
        )}
      </div>

      {/* Users List */}
      <div className="bg-default rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Users List</h2>
        </div>
        <div className="divide-y divide-default">
          {fetchingUsers ? (
            <div className="p-6 text-center text-muted">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-muted">
              No users found. Add your first user above.
            </div>
          ) : (
            <>
              {Array.isArray(users) && users.map((user) => (
                <div
                  key={user.id}
                  className={`p-6 flex justify-between items-center hover:bg-subtle ${
                    isCurrentUser(user.id) ? 'bg-status-info-bg border-l-4 border-focus' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{`${user.name} ${user.surname || ''}`.trim()}</h3>
                      {isCurrentUser(user.id) && (
                        <span className="text-xs bg-status-info-bg text-link px-2 py-0.5 rounded">You</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        user.roles?.length
                          ? 'bg-category-purple-bg text-category-purple-fg'
                          : 'bg-muted text-default'
                      }`}>
                        {rolesLabel(user.roles)}
                      </span>
                    </div>
                    <p className="text-default">{user.email}</p>
                    <p className="text-sm text-muted font-mono">{user.id}</p>
                    {user.isaUsersId && <p className="text-sm text-muted">ISA ID: <span className="font-mono">{user.isaUsersId}</span></p>}
                    {user.country && <p className="text-sm text-muted">Country: {user.country}</p>}
                    {user.city && <p className="text-sm text-muted">City: {user.city}</p>}
                    {user.birthdate && <p className="text-sm text-muted">Birthdate: {user.birthdate}</p>}
                    {user.gender && <p className="text-sm text-muted capitalize">Gender: {user.gender}</p>}
                    <div className="flex gap-4 text-sm text-muted mt-1">
                      <span>Points: {user.totalPoints || 0}</span>
                      <span>Contests: {user.contestsParticipated || 0}</span>
                    </div>
                    {user.userSubTypes && user.userSubTypes.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {user.userSubTypes.map(subType => (
                          <span
                            key={subType}
                            className={`text-xs px-2 py-0.5 rounded ${
                              subType === user.primarySubType
                                ? 'bg-status-success-bg text-success font-medium'
                                : 'bg-muted text-default'
                            }`}
                          >
                            {subType}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="primary"
                      onClick={() => startEditing(user)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => startEditingRole(user)}
                    >
                      Roles
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              <div className="p-4 border-t">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm text-muted">
                    Showing {users.length}{totalCount !== null ? ` / ${totalCount}` : ''} users
                  </span>
                  {hasMore && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-default">Load:</span>
                        <div className="flex items-center border rounded-md overflow-hidden">
                          <button
                            onClick={decrementPageSize}
                            disabled={loadingMore || pageSize === PAGE_SIZE_OPTIONS[0]}
                            className="px-2 py-1 bg-muted hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed border-r"
                            title="Decrease batch size"
                          >
                            ◀
                          </button>
                          <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            disabled={loadingMore}
                            className="px-3 py-1 bg-default text-center appearance-none cursor-pointer disabled:opacity-50"
                          >
                            {PAGE_SIZE_OPTIONS.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <button
                            onClick={incrementPageSize}
                            disabled={loadingMore || pageSize === PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1]}
                            className="px-2 py-1 bg-muted hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed border-l"
                            title="Increase batch size"
                          >
                            ▶
                          </button>
                        </div>
                        <button
                          onClick={() => loadMore()}
                          disabled={loadingMore}
                          className="bg-action-primary-bg text-inverse px-4 py-1 rounded-md hover:bg-action-primary-bg disabled:opacity-50 transition-colors"
                        >
                          {loadingMore ? 'Loading...' : 'Load More'}
                        </button>
                      </div>
                      <div className="flex justify-center gap-2">
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <button
                            key={size}
                            onClick={() => loadMore(size)}
                            disabled={loadingMore}
                            className="text-xs px-2 py-1 bg-subtle text-default rounded hover:bg-muted disabled:opacity-50 transition-colors"
                          >
                            +{size}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
