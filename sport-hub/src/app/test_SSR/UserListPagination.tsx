'use client';

import { useState, useEffect, useCallback } from 'react';
import UserManagementModal from '@ui/UserForm/UserManagementModal';
import { deleteUser } from './actions';
import Button from '@ui/Button';
import SearchBar from './SearchBar';
import { rolesLabel, type Role, type UserRoleFilter, type UserSubType } from 'src/types/rbac';

interface User {
  id: string;
  name: string;
  surname?: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  isaUsersId?: string;
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: string;
  totalPoints?: number;
  contestsParticipated?: number;
  roles?: Role[];
  userSubTypes?: UserSubType[];
  primarySubType?: UserSubType;
}

interface UserListPaginationProps {
  initialUsers: User[];
  initialCursor: string | null;
  initialHasMore: boolean;
  totalCount: number;
  currentUserId?: string;
}

const DEFAULT_PAGE_SIZE = 100;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 250, 500, 1000];

export default function UserListPagination({
  initialUsers,
  initialCursor,
  initialHasMore,
  totalCount: initialTotalCount,
  currentUserId,
}: UserListPaginationProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter | ''>('');
  const [isSearching, setIsSearching] = useState(false);

  const isFiltered = !!searchQuery || !!roleFilter;

  const fetchUsers = useCallback(async (search: string, role: UserRoleFilter | '', cursorValue?: string | null, append = false) => {
    if (append) {
      setLoading(true);
    } else {
      setIsSearching(true);
    }

    try {
      const params = new URLSearchParams({ limit: String(append ? pageSize : DEFAULT_PAGE_SIZE) });
      if (cursorValue) {
        params.set('cursor', cursorValue);
      }
      if (search) {
        params.set('search', search);
      }
      if (role) {
        params.set('role', role);
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
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  }, [pageSize]);

  const handleSearch = (query: string, role: UserRoleFilter | '') => {
    setSearchQuery(query);
    setRoleFilter(role);
    setCursor(null);
    if (!query && !role) {
      handleClearSearch();
      return;
    }
    fetchUsers(query, role);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setRoleFilter('');
    setUsers(initialUsers);
    setCursor(initialCursor);
    setHasMore(initialHasMore);
    setTotalCount(initialTotalCount);
  };

  const loadMore = async (customLimit?: number) => {
    if (!cursor || loading) return;
    const limit = customLimit ?? pageSize;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        cursor: cursor,
      });
      if (searchQuery) {
        params.set('search', searchQuery);
      }
      if (roleFilter) {
        params.set('role', roleFilter);
      }
      const response = await fetch(`/api/about?${params.toString()}`);
      const data = await response.json();

      if (data.users && Array.isArray(data.users)) {
        setUsers(prev => [...prev, ...data.users]);
        setCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error loading more users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reset to initial data when initialUsers changes (e.g., after server action)
  useEffect(() => {
    if (!isFiltered) {
      setUsers(initialUsers);
      setCursor(initialCursor);
      setHasMore(initialHasMore);
      setTotalCount(initialTotalCount);
    }
  }, [initialUsers, initialCursor, initialHasMore, initialTotalCount, isFiltered]);

  const handleDelete = async (id: string) => {
    const formData = new FormData();
    formData.set('id', id);
    await deleteUser(formData);
    // The server action refreshes the unfiltered list; drop the row from a filtered one too
    setUsers(prev => prev.filter(u => u.id !== id));
    setTotalCount(prev => prev - 1);
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

  return (
    <>
      {/* Search Bar */}
      <div className="p-4 border-b">
        <SearchBar
          onSearch={handleSearch}
          onClear={handleClearSearch}
          isSearching={isSearching}
          currentQuery={searchQuery}
          currentRole={roleFilter}
        />
      </div>

      {/* User List */}
      {isSearching ? (
        <div className="p-6 text-center text-gray-500">
          Searching...
        </div>
      ) : users.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          {isFiltered ? 'No users found matching the search.' : 'No users found.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="px-4 py-2 font-medium whitespace-nowrap">First Name</th>
                <th className="px-4 py-2 font-medium whitespace-nowrap">Last Name</th>
                <th className="px-4 py-2 font-medium whitespace-nowrap">Email Address</th>
                <th className="px-4 py-2 font-medium whitespace-nowrap">Role</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-gray-50 ${user.id === currentUserId ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-2 font-medium whitespace-nowrap">
                    {user.name}
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">You</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium whitespace-nowrap">{user.surname}</td>
                  <td className="px-4 py-2 text-gray-600 break-all">{user.email}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${
                      user.roles?.length
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {rolesLabel(user.roles)}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <Button
                        as="link"
                        href={`/athlete/${encodeURIComponent(user.id)}`}
                        variant="secondary"
                        size="small"
                      >
                        Visit Profile
                      </Button>
                      <UserManagementModal
                        action="UPDATE"
                        buttonSize="small"
                        user={user}
                        onDelete={() => handleDelete(user.id)}
                      />
                      <UserManagementModal action="ROLES" buttonSize="small" user={user} currentUserId={currentUserId} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="p-4 border-t">
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm text-gray-500">
            Showing {users.length} / {totalCount} users
            {isFiltered && ` (filtered)`}
          </span>
          {hasMore && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Load:</span>
                <div className="flex items-center border rounded-md overflow-hidden">
                  <button
                    onClick={decrementPageSize}
                    disabled={loading || pageSize === PAGE_SIZE_OPTIONS[0]}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed border-r"
                    title="Decrease batch size"
                  >
                    ◀
                  </button>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    disabled={loading}
                    className="px-3 py-1 bg-white text-center appearance-none cursor-pointer disabled:opacity-50"
                  >
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                  <button
                    onClick={incrementPageSize}
                    disabled={loading || pageSize === PAGE_SIZE_OPTIONS[PAGE_SIZE_OPTIONS.length - 1]}
                    className="px-2 py-1 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed border-l"
                    title="Increase batch size"
                  >
                    ▶
                  </button>
                </div>
                <button
                  onClick={() => loadMore()}
                  disabled={loading}
                  className="bg-blue-500 text-white px-4 py-1 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
              <div className="flex justify-center gap-2">
                {PAGE_SIZE_OPTIONS.map(size => (
                  <button
                    key={size}
                    onClick={() => loadMore(size)}
                    disabled={loading}
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
  );
}
