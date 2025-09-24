'use client';

import { useState } from 'react';
import { updateUser } from './actions';

interface User {
  createdAt: string;
  id: string;
  name: string;
  email: string;
  country?: string;
  totalPoints?: number;
  contestsParticipated?: number;
}

interface UserManagementClientProps {
  readonly user: User;
}

export default function UserManagementClient({ user }: UserManagementClientProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsEditing(true)}
        className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors"
      >
        Edit
      </button>

      {/* Edit User Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Edit User</h2>
            <form action={updateUser}>
              <input type="hidden" name="id" value={user.id} />
              <div className="space-y-4 mb-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Name *"
                  defaultValue={user.name}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email *"
                  defaultValue={user.email}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="text"
                  name="country"
                  placeholder="Country"
                  defaultValue={user.country || ''}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}