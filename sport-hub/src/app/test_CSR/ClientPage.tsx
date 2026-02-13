"use client"

import { useEffect, useState, useCallback, useRef } from 'react';
import { FormikHelpers, type FormikProps } from 'formik';
import Modal from '@ui/Modal';
import Button from '@ui/Button';
import UserForm from '../test_SSR/UserForm';

interface FormValues {
  id: string;
  name: string;
  surname: string;
  gender: string;
  email: string;
  country?: string;
  isaId?: string;
}

const DEFAULT_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 250, 500, 1000];
const ALL_SUB_TYPES = ['athlete', 'judge', 'organizer'] as const;

type Role = 'user' | 'admin';
type UserSubType = 'athlete' | 'judge' | 'organizer';
type Permission = string;

interface User {
  createdAt: string;
  id: string;
  name: string;
  email: string;
  country?: string;
  totalPoints?: number;
  contestsParticipated?: number;
  firstCompetition?: string;
  lastCompetition?: string;
  updatedAt?: string;
  role?: Role;
  userSubTypes?: UserSubType[];
  primarySubType?: UserSubType;
}

interface SessionInfo {
  user: {
    id: string;
    email: string;
    role: Role;
    cognitoSub?: string;
    permissions: Permission[];
  };
}

interface DbUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  userSubTypes: UserSubType[];
  primarySubType?: UserSubType;
}

type NewUserForm = Omit<User, 'createdAt' | 'totalPoints' | 'contestsParticipated' | 'firstCompetition' | 'lastCompetition' | 'updatedAt' | 'role' | 'userSubTypes' | 'primarySubType'>;

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
  const [selectedRole, setSelectedRole] = useState<Role>('user');
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
          name: values.name,
          email: values.email,
          country: values.country,
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

  const getEditFormInitialValues = (user: User): FormValues => ({
    id: user.id,
    name: user.name,
    surname: '',
    gender: 'male',
    email: user.email,
    country: user.country || '',
    isaId: '',
  });

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
    setSelectedRole(user.role || 'user');
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
          role: selectedRole,
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
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sessionRole = session?.user?.role || 'user';
  const dbRole = dbUser?.role || 'user';
  const roleMismatch = session && dbUser && sessionRole !== dbRole;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Users Management (CSR)</h1>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
          {process.env.NODE_ENV === 'development' ? 'Dev Mode' : 'Admin Only'}
        </span>
      </div>

      {/* Current User Panel */}
      <div className="bg-white rounded-lg shadow-md mb-6 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
          <h2 className="text-xl font-semibold text-white">Current User</h2>
        </div>

        <div className="p-6">
          {sessionLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ) : !session ? (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-3">Not signed in</p>
              <a
                href="/auth/signin"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Sign In
              </a>
            </div>
          ) : (
            <>
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
                        <dd className="text-gray-900">{dbUser.name}</dd>
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
                    <p className="text-sm text-red-600">User not found in database</p>
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
                {session.user.permissions && session.user.permissions.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {session.user.permissions.map((perm: Permission) => (
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
                  {JSON.stringify({ session, dbUser }, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      </div>

      {/* Add User Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        <form onSubmit={createUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="User ID (optional)"
              value={newUser.id}
              onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Name *"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              placeholder="Email *"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Country"
              value={newUser.country || ''}
              onChange={(e) => setNewUser({ ...newUser, country: e.target.value })}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Adding...' : 'Add User'}
          </button>
        </form>
      </div>

      {/* Edit User Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={cancelEditing}
        title="Edit User"
        formRef={formRef}
        showDefaultActions={true}
      >
        {editingUser && (
          <UserForm
            initialValues={getEditFormInitialValues(editingUser)}
            onSubmit={handleEditFormSubmit}
            showSubmitButton={false}
            formRef={formRef}
          />
        )}
      </Modal>

      {/* Role Management Modal */}
      <Modal
        isOpen={!!editingRoleUser}
        onClose={() => setEditingRoleUser(null)}
        title="Manage Roles & Types"
        showDefaultActions={false}
      >
        {editingRoleUser && (
          <div className="space-y-6">
            {message && (
              <div className={`px-4 py-3 rounded ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {message.text}
              </div>
            )}

            {/* User Info */}
            <div className="pb-4 border-b">
              <p className="font-medium">{editingRoleUser.name}</p>
              <p className="text-sm text-gray-500">{editingRoleUser.email}</p>
              {isCurrentUser(editingRoleUser.id) && (
                <p className="text-xs text-blue-600 mt-1">
                  This is your account. Role changes require re-login.
                </p>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role (Authorization)
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedRole('user')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    selectedRole === 'user'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">User</div>
                  <div className="text-xs text-gray-500">Standard access</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-colors ${
                    selectedRole === 'admin'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium">Admin</div>
                  <div className="text-xs text-gray-500">Full access</div>
                </button>
              </div>
            </div>

            {/* Sub-Types Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Types (Classification)
              </label>
              <div className="space-y-2">
                {ALL_SUB_TYPES.map(subType => (
                  <label
                    key={subType}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSubTypes.includes(subType)
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedSubTypes.includes(subType)}
                        onChange={() => handleSubTypeToggle(subType)}
                        className="w-4 h-4 text-green-600 rounded"
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
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {primarySubType === subType ? 'Primary' : 'Set Primary'}
                      </button>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Sub-types are for classification only, not authorization.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="secondary"
                onClick={() => setEditingRoleUser(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveRoleChanges}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-gray-300 p-3 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
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
            className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            Search
          </button>
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="bg-gray-200 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Searching for: <span className="font-medium">&quot;{searchQuery}&quot;</span>
          </p>
        )}
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Users List</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {fetchingUsers ? (
            <div className="p-6 text-center text-gray-500">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users found. Add your first user above.
            </div>
          ) : (
            <>
              {Array.isArray(users) && users.map((user) => (
                <div
                  key={user.id}
                  className={`p-6 flex justify-between items-center hover:bg-gray-50 ${
                    isCurrentUser(user.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{user.name}</h3>
                      {isCurrentUser(user.id) && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">You</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.role || 'user'}
                      </span>
                    </div>
                    <p className="text-gray-600">{user.email}</p>
                    <p className="text-sm text-gray-500 font-mono">{user.id}</p>
                    {user.country && <p className="text-sm text-gray-500">Country: {user.country}</p>}
                    <div className="flex gap-4 text-sm text-gray-500 mt-1">
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
                                ? 'bg-green-100 text-green-800 font-medium'
                                : 'bg-gray-100 text-gray-600'
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
                      variant="destructive"
                      onClick={() => deleteUser(user.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
              <div className="p-4 border-t">
                <div className="flex flex-col items-center gap-3">
                  <span className="text-sm text-gray-500">
                    Showing {users.length}{totalCount !== null ? ` / ${totalCount}` : ''} users
                  </span>
                  {hasMore && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Load:</span>
                        <div className="flex items-center border rounded-md overflow-hidden">
                          <button
                            onClick={decrementPageSize}
                            disabled={loadingMore || pageSize === PAGE_SIZE_OPTIONS[0]}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed border-r"
                            title="Decrease batch size"
                          >
                            ◀
                          </button>
                          <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            disabled={loadingMore}
                            className="px-3 py-1 bg-white text-center appearance-none cursor-pointer disabled:opacity-50"
                          >
                            {PAGE_SIZE_OPTIONS.map(size => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <button
                            onClick={incrementPageSize}
                            disabled={loadingMore || pageSize === PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1]}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed border-l"
                            title="Increase batch size"
                          >
                            ▶
                          </button>
                        </div>
                        <button
                          onClick={() => loadMore()}
                          disabled={loadingMore}
                          className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
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
                            className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50 transition-colors"
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
