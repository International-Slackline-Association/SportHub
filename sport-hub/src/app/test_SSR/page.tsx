import type { Metadata } from 'next';
import { dynamodb } from '@lib/dynamodb';
import { auth } from '@lib/auth';
import UserForm from './UserForm';
import UserListPagination from './UserListPagination';
import CurrentUserPanel from './CurrentUserPanel';
import { requireTestPageAccess } from '@lib/test-page-access';
import type { Role, UserSubType } from 'src/types/rbac';

export const metadata: Metadata = {
  title: 'SportHub - Test SSR',
};

const TABLE_NAME = 'users';
const PAGE_SIZE = 100;

interface User {
  id: string;
  name: string;
  surname?: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
  country?: string;
  firstCompetition?: string;
  lastCompetition?: string;
  totalPoints?: number;
  contestsParticipated?: number;
  role?: Role;
  userSubTypes?: UserSubType[];
  primarySubType?: UserSubType;
}

interface PaginatedUsersResult {
  users: User[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

async function getUsers(): Promise<PaginatedUsersResult> {
  try {
    const filterOptions = {
      filterExpression: 'sortKey = :profileKey',
      expressionAttributeValues: { ':profileKey': 'Profile' },
    };

    // Get total count and paginated results
    const [totalCount, result] = await Promise.all([
      dynamodb.countItems(TABLE_NAME, filterOptions),
      dynamodb.scanItemsPaginated(TABLE_NAME, {
        limit: PAGE_SIZE,
        ...filterOptions,
      }),
    ]);

    const users = result.items ? result.items.map(item => ({
      id: (item.userId ?? item.id ?? '') as string,
      name: (item.name ?? item.athleteSlug ?? '') as string,
      surname: (item.surname ?? '') as string,
      email: (item.email ?? '') as string,
      createdAt: (item.createdAt ?? '') as string,
      updatedAt: item.updatedAt as string | undefined,
      userId: item.userId as string | undefined,
      country: item.country as string | undefined,
      firstCompetition: item.firstCompetition as string | undefined,
      lastCompetition: item.lastCompetition as string | undefined,
      totalPoints: (item.totalPoints as number) ?? 0,
      contestsParticipated: ((item.contestsParticipated ?? item.contestCount) as number) ?? 0,
      role: (item.role as Role) ?? 'user',
      userSubTypes: (item.userSubTypes as UserSubType[]) ?? [],
      primarySubType: item.primarySubType as UserSubType | undefined,
    })) : [];

    const nextCursor = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : null;

    return { users, nextCursor, hasMore: result.hasMore, totalCount };
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    // Handle missing table gracefully - check multiple possible error formats
    if ((error && typeof error === 'object' && 'name' in error && error.name === 'ResourceNotFoundException') ||
        (error && typeof error === 'object' && '__type' in error && typeof error.__type === 'string' && error.__type.includes('ResourceNotFoundException')) ||
        (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('non-existent table'))) {
      console.log(`Table ${TABLE_NAME} does not exist. Visit /test_LOCAL to create tables.`);
    }
    return { users: [], nextCursor: null, hasMore: false, totalCount: 0 };
  }
}

async function getCurrentUserFromDb(userId: string): Promise<User | null> {
  try {
    const item = await dynamodb.getItem(TABLE_NAME, {
      userId: userId,
      sortKey: 'Profile',
    });

    if (!item) return null;

    return {
      id: (item.userId ?? item.id ?? '') as string,
      name: (item.name ?? item.athleteSlug ?? '') as string,
      surname: (item.surname ?? '') as string,
      email: (item.email ?? '') as string,
      createdAt: (item.createdAt ?? '') as string,
      updatedAt: item.updatedAt as string | undefined,
      userId: item.userId as string | undefined,
      country: item.country as string | undefined,
      firstCompetition: item.firstCompetition as string | undefined,
      lastCompetition: item.lastCompetition as string | undefined,
      totalPoints: (item.totalPoints as number) ?? 0,
      contestsParticipated: ((item.contestsParticipated ?? item.contestCount) as number) ?? 0,
      role: (item.role as Role) ?? 'user',
      userSubTypes: (item.userSubTypes as UserSubType[]) ?? [],
      primarySubType: item.primarySubType as UserSubType | undefined,
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

export default async function AboutPage() {
  await requireTestPageAccess();

  const session = await auth();

  // Fetch users list and current user's DB record in parallel
  const [usersResult, currentUserData] = await Promise.all([
    getUsers(),
    session?.user?.id ? getCurrentUserFromDb(session.user.id) : Promise.resolve(null),
  ]);

  const { users, nextCursor, hasMore, totalCount } = usersResult;

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Users Management (SSR)</h1>
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
          {process.env.NODE_ENV === 'development' ? 'Dev Mode' : 'Admin Only'}
        </span>
      </div>

      {/* Current User Session Panel */}
      <CurrentUserPanel
        session={session}
        dbUser={currentUserData}
      />

      {/* Add User Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        <UserForm />
      </div>

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Users List</h2>
        </div>
        <div className="divide-y divide-gray-200">
          <UserListPagination
            initialUsers={users}
            initialCursor={nextCursor}
            initialHasMore={hasMore}
            totalCount={totalCount}
            currentUserId={session?.user?.id}
          />
        </div>
      </div>
    </div>
  );
}