'use client';

import { useState, useEffect, useCallback } from 'react';
import UserManagementClient from './UserManagementClient';
import { deleteUser } from './actions';
import Button from '@ui/Button';
import SearchBar from './SearchBar';
import type { Role, UserSubType } from 'src/types/rbac';

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
  firstCompetition?: string;
  lastCompetition?: string;
  totalPoints?: number;
  contestsParticipated?: number;
  role?: Role;
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
  const [isSearching, setIsSearching] = useState(false);

  const fetchUsers = useCallback(async (search: string, cursorValue?: string | null, append = false) => {
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCursor(null);
    fetchUsers(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
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
    if (!searchQuery) {
      setUsers(initialUsers);
      setCursor(initialCursor);
      setHasMore(initialHasMore);
      setTotalCount(initialTotalCount);
    }
  }, [initialUsers, initialCursor, initialHasMore, initialTotalCount, searchQuery]);

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
        />
      </div>

      {/* User List */}
      {isSearching ? (
        <div className="p-6 text-center text-gray-500">
          Searching...
        </div>
      ) : users.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          {searchQuery ? `No users found matching "${searchQuery}"` : 'No users found.'}
        </div>
      ) : (
        users.map((user) => (
          <div
            key={user.id}
            className={`p-6 flex justify-between items-center hover:bg-gray-50 ${
              user.id === currentUserId ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{`${user.name} ${user.surname || ''}`.trim()}</h3>
                {user.id === currentUserId && (
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
              {user.isaUsersId && <p className="text-sm text-gray-500">ISA ID: <span className="font-mono">{user.isaUsersId}</span></p>}
              {user.country && <p className="text-sm text-gray-500">Country: {user.country}</p>}
              {user.city && <p className="text-sm text-gray-500">City: {user.city}</p>}
              {user.birthdate && <p className="text-sm text-gray-500">Birthdate: {user.birthdate}</p>}
              {user.gender && <p className="text-sm text-gray-500 capitalize">Gender: {user.gender}</p>}
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
              <UserManagementClient user={user} currentUserId={currentUserId} />
              <form action={deleteUser} style={{ display: 'inline' }}>
                <input type="hidden" name="id" value={user.id} />
                <Button
                  type="submit"
                  variant="destructive"
                >
                  Delete
                </Button>
              </form>
            </div>
          </div>
        ))
      )}
      <div className="p-4 border-t">
        <div className="flex flex-col items-center gap-3">
          <span className="text-sm text-gray-500">
            Showing {users.length} / {totalCount} users
            {searchQuery && ` (filtered)`}
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
