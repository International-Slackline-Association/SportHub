'use client';

import { useState } from 'react';
import type { UserRecord } from '@lib/relational-types';
import type { UserSubType } from '../../../types/rbac';
import { updateUserRole, updateUserSubTypes } from '../actions';

interface RoleManagerProps {
  users: UserRecord[];
  currentUserId: string;
}

export default function RoleManager({ users, currentUserId }: RoleManagerProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleRoleUpdate = async (userId: string, newRole: 'user' | 'admin') => {
    setIsUpdating(userId);
    setMessage(null);

    try {
      const result = await updateUserRole(userId, newRole);

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || 'Role updated successfully',
        });

        // Refresh the page to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to update role',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred',
      });
      console.error(error);
    } finally {
      setIsUpdating(null);
    }
  };

  const handleSubTypeToggle = async (userId: string, subType: UserSubType, currentSubTypes: UserSubType[]) => {
    setIsUpdating(userId);
    setMessage(null);

    try {
      // Toggle the sub-type
      const newSubTypes = currentSubTypes.includes(subType)
        ? currentSubTypes.filter(st => st !== subType)
        : [...currentSubTypes, subType];

      const result = await updateUserSubTypes(userId, newSubTypes);

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message || 'Sub-types updated successfully',
        });

        // Refresh the page to show updated data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setMessage({
          type: 'error',
          text: result.error || 'Failed to update sub-types',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred',
      });
      console.error(error);
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div>
      {message && (
        <div
          className={`mb-4 px-4 py-3 rounded ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sub-Types
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.userId} className={user.userId === currentUserId ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name}
                    {user.userId === currentUserId && (
                      <span className="ml-2 text-xs text-blue-600">(You)</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{user.userId.slice(0, 20)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col gap-2">
                    {(['organizer', 'judge', 'athlete'] as UserSubType[]).map((subType) => {
                      const currentSubTypes = user.userSubTypes || [];
                      const isChecked = currentSubTypes.includes(subType);
                      return (
                        <label
                          key={subType}
                          className="flex items-center gap-2 text-sm cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleSubTypeToggle(user.userId, subType, currentSubTypes)}
                            disabled={isUpdating === user.userId}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          <span className="text-gray-700 capitalize">{subType}</span>
                        </label>
                      );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    {user.role !== 'admin' && (
                      <button
                        onClick={() => handleRoleUpdate(user.userId, 'admin')}
                        disabled={isUpdating === user.userId}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating === user.userId ? 'Updating...' : 'Make Admin'}
                      </button>
                    )}
                    {user.role !== 'user' && (
                      <button
                        onClick={() => handleRoleUpdate(user.userId, 'user')}
                        disabled={isUpdating === user.userId}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating === user.userId ? 'Updating...' : 'Make User'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
