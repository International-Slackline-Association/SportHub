'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIn, useFormikContext } from 'formik';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { UserProfileRecord } from '@lib/relational-types';
import { Option } from '@ui/Form';
import { Alert } from '@ui/Alert';

const createUserLabel = (user: UserProfileRecord) => `${user.name} ${user.surname} | ${user.userId}`.toLocaleLowerCase();

type Props = { formKey: string; onSelectOption?: (option: Option) => void; readOnlyIfSet?: boolean };

export default function UserAutocomplete<TFormValues>({
  formKey,
  readOnlyIfSet,
  ...autocompleteProps
}: Props) {
  const { setFieldTouched, setFieldValue, values } = useFormikContext<TFormValues>();
  const formKeyName = `${formKey}.name`;
  const formikValueUserId = getIn(values, `${formKey}.id`);
  const currentFormValueUserName = getIn(values, formKeyName); // safe access
  const [debouncedUserName, setDebouncedUserName] = useState(currentFormValueUserName);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserName(currentFormValueUserName), 300);
    return () => clearTimeout(t);
  }, [currentFormValueUserName]);

  const isReadOnly = Boolean(readOnlyIfSet && formikValueUserId);

  const { data: allUsers, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await fetch('/api/users')).json(),
    // Enable only when user has typed at least 3 chars and not in read-only mode
    enabled: !isReadOnly && debouncedUserName.length >= 3,
    // Cache for 1 hour, consider data fresh for 10 minutes
    gcTime: 60 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    // Avoid automatic refetches since this component is used many times in a form
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  });

  // Memoize filtering so it only re-runs when the shared data or this instance's
  // search term changes — not on every Formik re-render of sibling rows.
  const users = useMemo(
    () => allUsers?.filter((user: UserProfileRecord) =>
      createUserLabel(user).includes(debouncedUserName.toLowerCase())
    ),
    [allUsers, debouncedUserName]
  );

  // When readOnlyIfSet and the entry already has an id, show a profile link — no query needed
  if (isReadOnly) {
    return (
      <div className="stack gap-1">
        <span className="text-xs text-gray-500">Name</span>
        <a
          href={`/athlete-profile/${formikValueUserId}`}
          className="text-sm px-2 py-1.5 border border-gray-200 rounded bg-gray-50 text-blue-600 hover:underline min-w-32 inline-block"
        >
          {currentFormValueUserName || formikValueUserId}
        </a>
      </div>
    );
  }

  const userOptions = users?.map(({ name, surname, userId }: UserProfileRecord) => {
    const displayName = [name, surname].filter(Boolean).join(' ') || userId;
    return { label: `${displayName} | ${userId}`, value: userId };
  }) || [];

  const currentUser = users?.find((user: UserProfileRecord) => user.userId === formikValueUserId);
  const isUnknownUser = formikValueUserId == "" && currentFormValueUserName != "";

  let caption = "";
  if (isUnknownUser) {
    caption = "Unknown user";
  } else if (formikValueUserId) {
    caption = `UserID: ${formikValueUserId}`;
  }

  if (isError) {
    return <Alert>Error loading users for autocomplete.</Alert>;
  }

  return (
    <FormikAutocomplete
      caption={caption}
      id={formKeyName}
      name={formKeyName}
      isLoading={isLoading}
      hideErrorMessage
      getDisplayValue={(value: unknown) => {
        if (currentUser) {
          return createUserLabel(currentUser);
        }
        return value as string;
      }}
      label="Name"
      mapOptionToValue={(o) => o.label}
      options={userOptions}
      onSelectOption={(option: Option) => {
        const formValue = getIn(values, formKey) || {};
        const displayName = option.label.split('|')[0].trim();
        const id = option.value;

        const athletePayload = typeof formValue === 'string'
          ? { id, name: displayName }
          : { ...formValue, id, name: displayName };

        setFieldValue(formKey, athletePayload);
        setFieldTouched(formKey, true, false);
      }}
      placeholder="Search by name or user ID (min 3 chars)"
      required
      {...autocompleteProps}
    />
  );
}