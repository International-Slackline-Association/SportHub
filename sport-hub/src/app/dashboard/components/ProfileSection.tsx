'use client';

import { useState } from 'react';
import ProfileEditForm from './ProfileEditForm';
import { getCountryByName } from '@utils/countries';
import { CircleFlag } from 'react-circle-flags';
import { rolesLabel, type Role } from 'src/types/rbac';
import { Button } from '@slacklineinternational/onsight/react';

interface ProfileSectionProps {
  userId: string;
  isaUsersId?: string;
  name: string;
  surname?: string;
  email: string;
  country?: string;
  city?: string;
  birthdate?: string;
  gender?: string;
  links?: string[];
  roles: Role[];
}

export default function ProfileSection({
  userId,
  isaUsersId,
  name,
  surname,
  email,
  country,
  city,
  birthdate,
  gender,
  links,
  roles,
}: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Get country code for flag display
  const countryData = country ? getCountryByName(country) : undefined;

  const linkEntries = links?.filter(Boolean) || [];

  const handleSuccess = () => {
    setIsEditing(false);
    setShowSuccess(true);
    // Hide success message after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };

  if (isEditing) {
    return (
      <ProfileEditForm
        userId={userId}
        initialData={{ name, surname, email, country, city, birthdate, gender, links }}
        onCancel={() => setIsEditing(false)}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div>
      {showSuccess && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          Profile updated successfully!
        </div>
      )}

      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{`${name} ${surname || ''}`.trim() || 'Not provided'}</dd>
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
            <dt className="text-sm font-medium text-gray-500">City</dt>
            <dd className="mt-1 text-sm text-gray-900">{city || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Birthdate</dt>
            <dd className="mt-1 text-sm text-gray-900">{birthdate || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Gender</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{gender || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Roles</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  roles.length > 0
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {rolesLabel(roles)}
              </span>
            </dd>
          </div>
          {/* <div>
            <dt className="text-sm font-medium text-gray-500">SportHub User ID</dt>
            <dd className="mt-1 text-xs text-gray-900 font-mono break-all">{userId}</dd>
          </div> */}
          {isaUsersId && (
            <div>
              <dt className="text-sm font-medium text-gray-500">ISA User ID</dt>
              <dd className="mt-1 text-xs text-gray-900 font-mono break-all">{isaUsersId}</dd>
            </div>
          )}
          {linkEntries.length > 0 && (
            <div className="col-span-full">
              <dt className="text-sm font-medium text-gray-500 mb-1">Links</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <div className="flex flex-wrap gap-2">
                  {linkEntries.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </dd>
            </div>
          )}
        </dl>
      </div>

      <Button
        className="mt-4"
        variant="neutral"
        onClick={() => setIsEditing(true)}
      >
        Edit
      </Button>
    </div>
  );
}
