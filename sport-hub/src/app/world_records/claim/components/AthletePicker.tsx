'use client';

import { getIn, useFormikContext } from 'formik';
import Button from '@ui/Button';
import { FormikSelectField, FormikTextField, countryCodeOptions, userGenderOptions } from '@ui/Form';
import UserAutocomplete from '@ui/UserAutocomplete';
import type { ClaimAthleteValue, ClaimFormValues } from '../types';

/**
 * One athlete row: search an existing SportHub profile, or enter a new athlete
 * whose profile is created when the claim is approved (FR-9).
 */
export default function AthletePicker({ index, onRemove }: { index: number; onRemove?: () => void }) {
  const { values, errors, touched, submitCount, setFieldValue } = useFormikContext<ClaimFormValues>();
  const athlete: ClaimAthleteValue = values.athletes[index];
  const key = `athletes.${index}`;
  const typedName = athlete.name?.trim() ?? '';
  const error = getIn(errors, key);
  const showError = typeof error === 'string' && (submitCount > 0 || !!getIn(touched, key));

  const addNew = () => {
    const parts = typedName.split(/\s+/);
    setFieldValue(key, {
      name: typedName,
      pendingUser: { name: parts[0] ?? '', surname: parts.slice(1).join(' '), email: '', gender: '', country: '', city: '', birthdate: '' },
    });
  };

  const clear = () => setFieldValue(key, { name: '' });

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
        <div className="stack gap-2">
          <UserAutocomplete
            formKey={key}
            label="SportHub profile"
            // Athletes on a claim store the profile as userId
            onSelectOption={option => setFieldValue(key, { userId: option.value, name: option.label.split('|')[0].trim() })}
          />
          {typedName && (
            <div>
              <Button type="button" variant="secondary" size="small" onClick={addNew}>
                Not on SportHub? Add &quot;{typedName}&quot; as a new athlete
              </Button>
            </div>
          )}
        </div>
      )}
      {showError && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
