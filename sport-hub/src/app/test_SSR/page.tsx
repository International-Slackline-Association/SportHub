import type { Metadata } from 'next';
import { dynamodb } from '@lib/dynamodb';
import { createUser, deleteUser } from './actions';
import UserManagementClient from './UserManagementClient';

export const metadata: Metadata = {
  title: 'SportHub - About',
};

interface User {
  'rankings-dev-key': string;
  id: string;
  name: string;
  email: string;
  createdAt: string;
  athleteId?: string;
  country?: string;
  firstCompetition?: string;
  lastCompetition?: string;
  updatedAt?: string;
  totalPoints?: number;
  contestsParticipated?: number;
}

const TABLE_NAME = 'rankings';

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
      athleteId: item.athleteId,
      country: item.country,
      firstCompetition: item.firstCompetition,
      lastCompetition: item.lastCompetition,
      totalPoints: item.totalPoints ?? 0,
      contestsParticipated: item.contestsParticipated ?? 0
    })) : [];
    return users;
  } catch (error: any) {
    console.error('Error fetching users:', error);
    // Handle missing table gracefully - check multiple possible error formats
    if (error?.name === 'ResourceNotFoundException' ||
        error?.__type?.includes('ResourceNotFoundException') ||
        (error?.message && error.message.includes('non-existent table'))) {
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
        <form action={createUser}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              name="id"
              placeholder="User ID (optional)"
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              name="name"
              placeholder="Name *"
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              name="email"
              placeholder="Email *"
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              name="country"
              placeholder="Country"
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors"
          >
            Add User
          </button>
        </form>
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
              <p className="text-sm mt-2">If tables don't exist, visit <a href="/test_LOCAL" className="text-blue-600 hover:underline">/test_LOCAL</a> to create them.</p>
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
                    <button
                      type="submit"
                      className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
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