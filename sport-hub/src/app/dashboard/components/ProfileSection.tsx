'use client';

import { useState } from 'react';
import ProfileEditForm from './ProfileEditForm';
import { getCountryByName } from '@utils/countries';
import { CircleFlag } from 'react-circle-flags';

interface ProfileSectionProps {
  userId: string;
  name: string;
  email: string;
  country?: string;
  role: string;
}

export default function ProfileSection({
  userId,
  name,
  email,
  country,
  role,
}: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get country code for flag display
  const countryData = country ? getCountryByName(country) : undefined;

  const handleSuccess = () => {
    setIsEditing(false);
    setShowSuccess(true);
    // Hide success message after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (isEditing) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Edit Profile</h2>
        <ProfileEditForm
          userId={userId}
          initialData={{ name, email, country }}
          onCancel={() => setIsEditing(false)}
          onSuccess={handleSuccess}
        />
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      {showSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Profile updated successfully!
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <h2 className="text-2xl font-bold">Profile</h2>
        <button
          onClick={() => setIsEditing(true)}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Edit Profile
        </button>
      </div>

      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{name || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{email || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Country</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {countryData ? (
                <div className="flex items-center gap-2">
                  <CircleFlag countryCode={countryData.code} height={22} width={22} />
                  <span>{countryData.name}</span>
                </div>
              ) : (
                'Not specified'
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Role</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {role}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Cognito User ID</dt>
            <dd className="mt-1 text-xs text-gray-900 font-mono break-all">{userId}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
