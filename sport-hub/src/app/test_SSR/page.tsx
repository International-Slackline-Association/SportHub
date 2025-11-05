import type { Metadata } from 'next';
import { dynamodb } from '@lib/dynamodb';
import { deleteUser } from './actions';
import UserManagementClient from './UserManagementClient';
import UserForm from './UserForm';
import Button from '@ui/Button';

export const metadata: Metadata = {
  title: 'SportHub - About',
};

const TABLE_NAME = process.env.DYNAMODB_LOCAL === 'true' ? 'rankings' : 'rankings-dev';

async function getUsers(): Promise<User[]> {
  try {
    const items = await dynamodb.scanItems(TABLE_NAME);
    const users = items ? items.map(item => ({
      'rankings-dev-key': item['rankings-dev-key'] ?? '',
      id: item.id ?? '',
      name: item.name ?? '',
      email: item.email ?? '',
      createdAt: item.createdAt ?? '',
      updatedAt: item.updatedAt,
      userId: item.userId,
      country: item.country,
      firstCompetition: item.firstCompetition,
      lastCompetition: item.lastCompetition,
      totalPoints: item.totalPoints ?? 0,
      contestsParticipated: item.contestsParticipated ?? 0
    })) : [];
    return users;
  } catch (error: unknown) {
    console.error('Error fetching users:', error);
    // Handle missing table gracefully - check multiple possible error formats
    if ((error && typeof error === 'object' && 'name' in error && error.name === 'ResourceNotFoundException') ||
        (error && typeof error === 'object' && '__type' in error && typeof error.__type === 'string' && error.__type.includes('ResourceNotFoundException')) ||
        (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.includes('non-existent table'))) {
      console.log(`Table ${TABLE_NAME} does not exist. Visit /test_LOCAL to create tables.`);
    }
    return [];
  }
}

export default async function AboutPage() {
  const users = await getUsers();

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Users Management</h1>

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
          {users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No users found.</p>
              <p className="text-sm mt-2">If tables don&apos;t exist, visit <a href="/test_LOCAL" className="text-blue-600 hover:underline">/test_LOCAL</a> to create them.</p>
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-6 flex justify-between items-center hover:bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <p className="text-gray-600">{user.email}</p>
                  <p className="text-sm text-gray-500">ID: {user.id}</p>
                  {user.country && <p className="text-sm text-gray-500">Country: {user.country}</p>}
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    <span>Points: {user.totalPoints || 0}</span>
                    <span>Contests: {user.contestsParticipated || 0}</span>
                  </div>
                  {(user.firstCompetition || user.lastCompetition) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {user.firstCompetition} → {user.lastCompetition}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <UserManagementClient user={user} />
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
        </div>
      </div>
    </div>
  );
}