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
        <div className="mb-4 bg-status-success-bg border border-default text-success px-4 py-3 rounded">
          Profile updated successfully!
        </div>
      )}

      <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-muted">Name</dt>
            <dd className="mt-1 text-sm text-default">{`${name} ${surname || ''}`.trim() || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Email</dt>
            <dd className="mt-1 text-sm text-default">{email || 'Not provided'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Country</dt>
            <dd className="mt-1 text-sm text-default">
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
            <dt className="text-sm font-medium text-muted">City</dt>
            <dd className="mt-1 text-sm text-default">{city || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Birthdate</dt>
            <dd className="mt-1 text-sm text-default">{birthdate || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Gender</dt>
            <dd className="mt-1 text-sm text-default capitalize">{gender || 'Not specified'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-muted">Roles</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  roles.length > 0
                    ? 'bg-category-purple-bg text-category-purple-fg'
                    : 'bg-muted text-default'
                }`}
              >
                {rolesLabel(roles)}
              </span>
            </dd>
          </div>
          {/* <div>
            <dt className="text-sm font-medium text-muted">SportHub User ID</dt>
            <dd className="mt-1 text-xs text-default font-mono break-all">{userId}</dd>
          </div> */}
          {isaUsersId && (
            <div>
              <dt className="text-sm font-medium text-muted">ISA User ID</dt>
              <dd className="mt-1 text-xs text-default font-mono break-all">{isaUsersId}</dd>
            </div>
          )}
          {linkEntries.length > 0 && (
            <div className="col-span-full">
              <dt className="text-sm font-medium text-muted mb-1">Links</dt>
              <dd className="mt-1 text-sm text-default">
                <div className="flex flex-wrap gap-2">
                  {linkEntries.map((url) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-info-bg text-link hover:bg-status-info-bg"
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
