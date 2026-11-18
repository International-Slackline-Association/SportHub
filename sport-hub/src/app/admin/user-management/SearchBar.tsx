'use client';

import { useEffect, useRef, useState } from 'react';
import { ROLES, ROLE_LABELS, type UserRoleFilter } from 'src/types/rbac';

interface SearchBarProps {
  onSearch: (query: string, roles: UserRoleFilter[]) => void;
  onClear: () => void;
  isSearching: boolean;
  currentQuery: string;
  currentRoles: UserRoleFilter[];
}

const ROLE_FILTER_OPTIONS: { value: UserRoleFilter; label: string }[] = [
  ...ROLES.map(role => ({ value: role, label: ROLE_LABELS[role] })),
  { value: 'none', label: 'No role (User)' },
];

const rolesSummary = (roles: UserRoleFilter[]) =>
  ROLE_FILTER_OPTIONS.filter(o => roles.includes(o.value)).map(o => o.label).join(', ');

export default function SearchBar({ onSearch, onClear, isSearching, currentQuery, currentRoles }: SearchBarProps) {
  const [searchInput, setSearchInput] = useState(currentQuery);
  const [rolesInput, setRolesInput] = useState<UserRoleFilter[]>(currentRoles);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);
  const isFiltered = !!currentQuery || currentRoles.length > 0;
  const hasManagerRoleFilter = currentRoles.some(r => r !== 'admin' && r !== 'none');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchInput.trim(), rolesInput);
  };

  // Ticking a role filters right away, together with the current search text
  const handleRoleToggle = (role: UserRoleFilter) => {
    const next = rolesInput.includes(role) ? rolesInput.filter(r => r !== role) : [...rolesInput, role];
    // Keep the options' order so the summary reads the same way as the menu
    const ordered = ROLE_FILTER_OPTIONS.map(o => o.value).filter(v => next.includes(v));
    setRolesInput(ordered);
    onSearch(searchInput.trim(), ordered);
  };

  const handleClear = () => {
    setSearchInput('');
    setRolesInput([]);
    onClear();
  };

  // Close the role menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isRoleMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!roleMenuRef.current?.contains(e.target as Node)) setIsRoleMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsRoleMenuOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isRoleMenuOpen]);

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
        <div className="relative" ref={roleMenuRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isRoleMenuOpen}
            onClick={() => setIsRoleMenuOpen(!isRoleMenuOpen)}
            disabled={isSearching}
            title={rolesInput.length ? rolesSummary(rolesInput) : 'All roles'}
            className="w-48 h-full flex items-center justify-between gap-2 border border-gray-300 p-3 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <span className="truncate">{rolesInput.length ? rolesSummary(rolesInput) : 'All roles'}</span>
            <svg className="w-4 h-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isRoleMenuOpen && (
            <div
              role="listbox"
              aria-multiselectable="true"
              className="absolute right-0 z-10 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg py-1"
            >
              {ROLE_FILTER_OPTIONS.map(({ value, label }) => (
                <label key={value} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={rolesInput.includes(value)}
                    onChange={() => handleRoleToggle(value)}
                    className="w-4 h-4"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
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
          {currentQuery && currentRoles.length > 0 && ' · '}
          {currentRoles.length > 0 && (
            <>Roles: <span className="font-medium">{rolesSummary(currentRoles)}</span></>
          )}
        </p>
      )}
      {hasManagerRoleFilter && (
        <p className="mt-1 text-xs text-gray-500">
          General Admins have every role but are only listed under General Admin.
        </p>
      )}
    </div>
  );
}
