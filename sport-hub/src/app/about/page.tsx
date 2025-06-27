"use client"

// import type { Metadata } from 'next'
import { useEffect, useState } from 'react';
 
// export const metadata: Metadata = {
//   title: 'SportHub - About',
// }

export default function AboutPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ id: '', name: '', email: '' });
  interface User {
    createdAt: any;
    id: number;
    name: string;
    email: string;
  }

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/about');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const createUser = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/about', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (response.ok) {
        setNewUser({ id: '', name: '', email: '' });
        fetchUsers();
      }
    } catch (error) {
      console.error('Error creating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);

    try {
      const response = await fetch(`/api/about/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingUser.name,
          email: editingUser.email,
        }),
      });

      if (response.ok) {
        setEditingUser(null);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await fetch(`/api/about/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const startEditing = (user: any) => {
    setEditingUser({ ...user });
  };

  const cancelEditing = () => {
    setEditingUser(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Users Management</h1>
      
      {/* Add User Form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New User</h2>
        <form onSubmit={createUser}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <input
              type="text"
              placeholder="User ID"
              value={newUser.id}
              onChange={(e) => setNewUser({ ...newUser, id: e.target.value })}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Name"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Edit User</h2>
            <form onSubmit={updateUser}>
              <div className="space-y-4 mb-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full border border-gray-300 p-3 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Updating...' : 'Update'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 bg-gray-500 text-white py-2 rounded-md hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Users List</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {users.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users found. Add your first user above.
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-6 flex justify-between items-center hover:bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{user.name}</h3>
                  <p className="text-gray-600">{user.email}</p>
                  <p className="text-sm text-gray-500">ID: {user.id}</p>
                  {user.createdAt && (
                    <p className="text-xs text-gray-400">
                      Created: {new Date(user.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => startEditing(user)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteUser(user.id)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
