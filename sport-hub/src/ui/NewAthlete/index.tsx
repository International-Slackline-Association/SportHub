'use client';

import { useState } from 'react';
import { getIn, useFormikContext } from 'formik';
import { Button, Dialog } from '@slacklineinternational/onsight/react';
import { FormikSelectField, FormikTextField, countryCodeOptions, userGenderOptions } from '@ui/Form';
import type { PendingUserData } from 'src/app/events/submit/types';
import { emptyPendingUser, pendingUserSchema } from './schema';

type Props = {
  /** Formik path of the entry that holds `pendingUser`, e.g. `contests.0.results.2` */
  formKey: string;
  /** Name typed into the profile search; offers "add as new" when set */
  typedName: string;
  /** "athlete" or "judge", used in labels */
  personLabel?: string;
  /** Shown under the badge, e.g. when the profile is created */
  hint?: string;
  /** Called on Remove; by default only `pendingUser` is cleared */
  onRemove?: () => void;
};

/**
 * Enter a person who has no SportHub profile yet, in a dialog. Shared by the
 * event results/judges form and the records & firsts claim form. Writes
 * `${formKey}.pendingUser`; the profile is created when an admin approves.
 */
export default function NewAthlete({ formKey, typedName, personLabel = 'athlete', hint, onRemove }: Props) {
  const { values, setFieldValue } = useFormikContext<unknown>();
  const [isOpen, setIsOpen] = useState(false);
  const [before, setBefore] = useState<PendingUserData | undefined>();
  const [showErrors, setShowErrors] = useState(false);

  const key = `${formKey}.pendingUser`;
  const pendingUser: PendingUserData | undefined = getIn(values, key);
  const isComplete = !!pendingUser && pendingUserSchema.isValidSync(pendingUser);
  const name = typedName.trim();

  const open = () => {
    setBefore(pendingUser);
    if (!pendingUser) setFieldValue(key, emptyPendingUser(name));
    setShowErrors(false);
    setIsOpen(true);
  };
  const cancel = () => {
    setFieldValue(key, before);
    setIsOpen(false);
  };
  const confirm = () => {
    if (!isComplete) {
      setShowErrors(true);
      return;
    }
    setIsOpen(false);
  };
  const remove = () => (onRemove ? onRemove() : setFieldValue(key, undefined));

  const dialog = (
    <Dialog
      open={isOpen}
      onClose={cancel}
      title={`New ${personLabel}`}
      actions={(
        <>
          <Button type="button" variant="neutral" onClick={cancel}>Cancel</Button>
          <Button type="button" variant="primary" onClick={confirm}>Confirm</Button>
        </>
      )}
    >
      <div className="stack gap-3">
        <p className="text-sm text-gray-600">
          Their SportHub profile is created when an admin approves. They get an email at this address.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormikTextField id={`${key}.name`} name={`${key}.name`} label="First name" required />
          <FormikTextField id={`${key}.surname`} name={`${key}.surname`} label="Last name" required />
          <FormikTextField id={`${key}.email`} name={`${key}.email`} label="Email" required />
          <FormikSelectField id={`${key}.gender`} name={`${key}.gender`} label="Gender" options={userGenderOptions} required />
          <FormikSelectField id={`${key}.country`} name={`${key}.country`} label="Country" options={countryCodeOptions} />
        </div>
        {showErrors && !isComplete && (
          <p className="text-sm text-red-600">Please fill in first name, last name, a valid email and gender.</p>
        )}
      </div>
    </Dialog>
  );

  if (pendingUser && !isOpen) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          New {personLabel}: {pendingUser.name} {pendingUser.surname}
        </span>
        {!isComplete && <span className="text-xs text-red-600">Details missing</span>}
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
        <button type="button" className="text-xs text-gray-500 underline hover:text-gray-700" onClick={open}>Edit</button>
        <button type="button" className="text-xs text-red-600 underline hover:text-red-700" onClick={remove}>Remove</button>
      </div>
    );
  }

  if (!pendingUser && !name) return null;

  return (
    <>
      {!pendingUser && (
        <Button type="button" variant="secondary" size="small" onClick={open}>
          Not on SportHub? Add &quot;{name}&quot; as a new {personLabel}
        </Button>
      )}
      {dialog}
    </>
  );
}
