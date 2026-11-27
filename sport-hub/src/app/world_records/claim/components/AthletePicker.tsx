'use client';

import { getIn, useFormikContext } from 'formik';
import UserAutocomplete from '@ui/UserAutocomplete';
import NewAthlete from '@ui/NewAthlete';
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

      {!athlete.userId && !athlete.pendingUser && (
        <UserAutocomplete
          formKey={key}
          label="SportHub profile"
          // Athletes on a claim store the profile as userId
          onSelectOption={option => setFieldValue(key, { userId: option.value, name: option.label.split('|')[0].trim() })}
        />
      )}
      {!athlete.userId && (
        <NewAthlete
          formKey={key}
          typedName={typedName}
          hint="Their SportHub profile is created when the claim is approved."
          onRemove={clear}
        />
      )}
      {showError && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
