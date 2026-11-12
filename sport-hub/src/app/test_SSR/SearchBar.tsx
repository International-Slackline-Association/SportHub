'use client';

import { useState } from 'react';
import { ROLES, ROLE_LABELS, type UserRoleFilter } from 'src/types/rbac';

interface SearchBarProps {
  onSearch: (query: string, role: UserRoleFilter | '') => void;
  onClear: () => void;
  isSearching: boolean;
  currentQuery: string;
  currentRole: UserRoleFilter | '';
}

const roleFilterLabel = (role: UserRoleFilter) => (role === 'none' ? 'No role (User)' : ROLE_LABELS[role]);

export default function SearchBar({ onSearch, onClear, isSearching, currentQuery, currentRole }: SearchBarProps) {
  const [searchInput, setSearchInput] = useState(currentQuery);
  const [roleInput, setRoleInput] = useState<UserRoleFilter | ''>(currentRole);
  const isFiltered = !!currentQuery || !!currentRole;
  const isManagerRoleFilter = !!currentRole && currentRole !== 'admin' && currentRole !== 'none';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput.trim(), roleInput);
  };

  // A role pick filters right away, together with the current search text
  const handleRoleChange = (role: UserRoleFilter | '') => {
    setRoleInput(role);
    onSearch(searchInput.trim(), role);
  };

  const handleClear = () => {
    setSearchInput('');
    setRoleInput('');
    onClear();
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full border border-gray-300 p-3 pl-10 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <select
          aria-label="Filter by role"
          value={roleInput}
          onChange={(e) => handleRoleChange(e.target.value as UserRoleFilter | '')}
          disabled={isSearching}
          className="border border-gray-300 p-3 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <option value="">All roles</option>
          {ROLES.map(role => (
            <option key={role} value={role}>{roleFilterLabel(role)}</option>
          ))}
          <option value="none">{roleFilterLabel('none')}</option>
        </select>
        <button
          type="submit"
          disabled={isSearching}
          className="bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          Search
        </button>
        {isFiltered && (
          <button
            type="button"
            onClick={handleClear}
            className="bg-gray-200 text-gray-700 px-4 py-3 rounded-md hover:bg-gray-300 transition-colors"
          >
            Clear
          </button>
        )}
      </form>
      {isFiltered && (
        <p className="mt-2 text-sm text-gray-600">
          {currentQuery && (
            <>Searching for: <span className="font-medium">&quot;{currentQuery}&quot;</span></>
          )}
          {currentQuery && currentRole && ' · '}
          {currentRole && (
            <>Role: <span className="font-medium">{roleFilterLabel(currentRole)}</span></>
          )}
        </p>
      )}
      {isManagerRoleFilter && (
        <p className="mt-1 text-xs text-gray-500">
          General Admins have every role but are only listed under General Admin.
        </p>
      )}
    </div>
  );
}
