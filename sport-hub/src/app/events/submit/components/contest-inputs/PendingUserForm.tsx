'use client';

import { useState } from 'react';
import { getIn, useFormikContext } from 'formik';
import { EventSubmissionFormValues, PendingUserData } from '../../types';
import Button from '@ui/Button';
import { FormikSelectField, FormikTextField, countryCodeOptions, userGenderOptions } from '@ui/Form';

type Props = { formKey: string };

export default function PendingUserForm({ formKey }: Props) {
  const { values, setFieldValue } = useFormikContext<EventSubmissionFormValues>();
  const [isOpen, setIsOpen] = useState(false);

  const userId: string = getIn(values, `${formKey}.id`) ?? '';
  const userName: string = getIn(values, `${formKey}.name`) ?? '';
  const pendingUser: PendingUserData | undefined = getIn(values, `${formKey}.pendingUser`);

  const isUnknownUser = !userId && !!userName;
  const isConfirmed = !!(pendingUser?.name && pendingUser?.surname && pendingUser?.email && pendingUser?.gender);

  const handleOpen = () => {
    if (!pendingUser) {
      const parts = userName.trim().split(/\s+/);
      setFieldValue(`${formKey}.pendingUser`, {
        name: parts[0] ?? '',
        surname: parts.slice(1).join(' '),
        email: '',
        gender: '',
        country: '',
        city: '',
        birthdate: '',
      });
    }
    setIsOpen(true);
  };

  const handleCancel = () => {
    if (!isConfirmed) {
      setFieldValue(`${formKey}.pendingUser`, undefined);
    }
    setIsOpen(false);
  };

  const handleConfirm = () => {
    const current: PendingUserData | undefined = getIn(values, `${formKey}.pendingUser`);
    if (!current?.name || !current?.surname || !current?.email || !current?.gender) {
      alert('Please fill in First Name, Last Name, Email, and Gender.');
      return;
    }
    setIsOpen(false);
  };

  const handleRemove = () => {
    setFieldValue(`${formKey}.pendingUser`, undefined);
    setIsOpen(false);
  };

  // Confirmed badge
  if (isConfirmed && !isOpen) {
    return (
      <div className="flex items-center gap-2 mt-1 flex-wrap">
        <span className="inline-flex items-center text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
          New: {pendingUser!.name} {pendingUser!.surname}
        </span>
        <button
          type="button"
          className="text-xs text-gray-500 underline hover:text-gray-700"
          onClick={handleOpen}
        >
          Edit
        </button>
        <button
          type="button"
          className="text-xs text-red-500 underline hover:text-red-700"
          onClick={handleRemove}
        >
          Remove
        </button>
      </div>
    );
  }

  // Inline form card
  if (isOpen) {
    return (
      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50 stack gap-3 mt-2 w-full">
        <div className="flex justify-between items-center">
          <h5 className="font-medium text-sm text-blue-900">New User Details</h5>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 text-xs leading-none"
            onClick={handleCancel}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FormikTextField id={`${formKey}.pendingUser.name`} label="First Name" required />
          <FormikTextField id={`${formKey}.pendingUser.surname`} label="Last Name" required />
          <FormikTextField id={`${formKey}.pendingUser.email`} label="Email" required />
          <FormikSelectField
            id={`${formKey}.pendingUser.gender`}
            label="Gender"
            options={userGenderOptions}
            required
          />
          <FormikSelectField
            id={`${formKey}.pendingUser.country`}
            label="Country"
            options={countryCodeOptions}
          />
          <FormikTextField id={`${formKey}.pendingUser.city`} label="City" />
          <FormikTextField
            id={`${formKey}.pendingUser.birthdate`}
            label="Birthdate"
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="primary" onClick={handleConfirm}>
            Confirm
          </Button>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Submit User button — only shown when user typed a name but no ID was found
  if (!isUnknownUser) return null;

  return (
    <Button type="button" variant="secondary" onClick={handleOpen}>
      Submit User
    </Button>
  );
}
