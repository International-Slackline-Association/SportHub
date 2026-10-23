'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormikContext } from 'formik';
import Button from '@ui/Button';
import { FormikSelectField, FormikTextField, countryCodeOptions, userGenderOptions } from '@ui/Form';
import type { ClaimAthleteValue, ClaimFormValues } from '../types';

type UserOption = { userId: string; name: string; surname: string };

const displayName = (u: UserOption) => [u.name, u.surname].filter(Boolean).join(' ') || u.userId;

/**
 * One athlete row: search an existing SportHub profile, or enter a new athlete
 * whose profile is created when the claim is approved (FR-9).
 */
export default function AthletePicker({ index, onRemove }: { index: number; onRemove?: () => void }) {
  const { values, setFieldValue } = useFormikContext<ClaimFormValues>();
  const athlete: ClaimAthleteValue = values.athletes[index];
  const key = `athletes.${index}`;
  const [query, setQuery] = useState(athlete.userId || athlete.pendingUser ? '' : athlete.name);
  const [debounced, setDebounced] = useState(query);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data: users, isLoading } = useQuery<UserOption[]>({
    queryKey: ['users', 'claim'],
    queryFn: async () => (await fetch('/api/users')).json(),
    enabled: debounced.length >= 3,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const matches = useMemo(() => {
    const q = debounced.toLowerCase();
    if (q.length < 3 || !Array.isArray(users)) return [];
    return users.filter(u => `${displayName(u)} ${u.userId}`.toLowerCase().includes(q)).slice(0, 10);
  }, [users, debounced]);

  const pick = (u: UserOption) => {
    setFieldValue(key, { userId: u.userId, name: displayName(u) });
    setQuery('');
    setOpen(false);
  };

  const addNew = () => {
    const parts = query.trim().split(/\s+/);
    setFieldValue(key, {
      name: query.trim(),
      pendingUser: { name: parts[0] ?? '', surname: parts.slice(1).join(' '), email: '', gender: '', country: '', city: '', birthdate: '' },
    });
    setOpen(false);
  };

  const clear = () => { setFieldValue(key, { name: '' }); setQuery(''); };

  return (
    <div className="border border-gray-200 rounded-lg p-3 stack gap-2">
      <div className="flex justify-between items-center gap-2">
        <span className="text-sm font-medium">Athlete {index + 1}</span>
        {onRemove && (
          <button type="button" className="text-xs text-red-600 underline" onClick={onRemove}>Remove</button>
        )}
      </div>

      {athlete.userId && (
        <div className="flex items-center gap-2 flex-wrap">
          <a href={`/athlete/${athlete.userId}`} target="_blank" className="text-blue-600 hover:underline text-sm">{athlete.name}</a>
          <span className="text-xs text-gray-500">SportHub profile</span>
          <button type="button" className="text-xs text-gray-500 underline" onClick={clear}>Change</button>
        </div>
      )}

      {athlete.pendingUser && (
        <div className="stack gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">New athlete</span>
            <span className="text-xs text-gray-500">Their SportHub profile is created when the claim is approved.</span>
            <button type="button" className="text-xs text-gray-500 underline" onClick={clear}>Cancel</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormikTextField id={`${key}.pendingUser.name`} name={`${key}.pendingUser.name`} label="First name" required />
            <FormikTextField id={`${key}.pendingUser.surname`} name={`${key}.pendingUser.surname`} label="Last name" required />
            <FormikTextField id={`${key}.pendingUser.email`} name={`${key}.pendingUser.email`} label="Email" required />
            <FormikSelectField id={`${key}.pendingUser.gender`} name={`${key}.pendingUser.gender`} label="Gender" options={userGenderOptions} required />
            <FormikSelectField id={`${key}.pendingUser.country`} name={`${key}.pendingUser.country`} label="Country" options={countryCodeOptions} />
          </div>
        </div>
      )}

      {!athlete.userId && !athlete.pendingUser && (
        <div className="relative">
          <input
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            placeholder="Search by name or user ID (min 3 characters)"
            value={query}
            onChange={e => { setQuery(e.target.value); setFieldValue(`${key}.name`, e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {open && debounced.length >= 3 && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-64 overflow-auto">
              {isLoading && <li className="px-3 py-2 text-sm text-gray-500">Loading…</li>}
              {matches.map(u => (
                <li key={u.userId}>
                  <button type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100" onMouseDown={() => pick(u)}>
                    {displayName(u)} <span className="text-gray-400">| {u.userId}</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" className="w-full text-left px-3 py-2 text-sm text-blue-700 hover:bg-gray-100" onMouseDown={addNew}>
                  Not on SportHub? Add &quot;{query.trim()}&quot; as a new athlete
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
      {!athlete.userId && !athlete.pendingUser && query.length > 0 && query.length < 3 && (
        <Button type="button" variant="secondary" size="small" onClick={addNew}>Add as new athlete</Button>
      )}
    </div>
  );
}
