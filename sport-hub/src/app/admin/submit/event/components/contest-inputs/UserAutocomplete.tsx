'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIn, useFormikContext } from 'formik';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { UserRecord } from '@lib/relational-types';
import { Option } from '@ui/Form';
import { ErrorMessage } from '../ErrorMessage';

const createUserLabel = (user: UserRecord) => `${user.name} | ${user.userId}`.toLocaleLowerCase();

type Props = { formKey: string; onSelectOption?: (option: Option) => void };

export default function UserAutocomplete<TFormValues>({
  formKey,
  onSelectOption,
  ...autocompleteProps
}: Props) {
  const { setFieldTouched, setFieldValue, values } = useFormikContext<TFormValues>();
  const formKeyUserName = `${formKey}.name`;
  const formikUserIdValue = getIn(values, `${formKey}.id`);
  const currentFormValueUserName = getIn(values, formKeyUserName); // safe access
  const [debouncedUserName, setDebouncedUserName] = useState(currentFormValueUserName);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserName(currentFormValueUserName), 300);
    return () => clearTimeout(t);
  }, [currentFormValueUserName]);

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await fetch('/api/users')).json(),
    // Enable only when user has typed at least 3 chars
    enabled: debouncedUserName.length >= 3,
    // Cache for 1 hour, consider data fresh for 10 minutes
    gcTime: 60 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    // Avoid automatic refetches since this component is used many times in a form
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    select: data => data.filter((user: UserRecord) =>
      createUserLabel(user).includes(debouncedUserName.toLowerCase()),
    ),
  });

  const userOptions = users?.map(({ name, userId }: UserRecord) => ({
    label: `${name} | ${userId}`,
    value: name,
  })) || [];

  const currentUser = users?.find((user: UserRecord) => user.userId === formikUserIdValue);

  if (isError) {
    return <ErrorMessage>Error loading users for autocomplete.</ErrorMessage>;
  }
console.log(debouncedUserName, "UserAutocomplete userOptions", users, userOptions);
  return (
    <FormikAutocomplete
      caption={formikUserIdValue && `UserID: ${formikUserIdValue}`}
      id={formKeyUserName}
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
        const [name, id] = option.label.split('|');

        let athletePayload = {};
        if (typeof formValue === "string") {
          athletePayload = { id, name };
        } else {
          athletePayload = { ...formValue, id, name };
        }

        setFieldValue(formKey, athletePayload);
        setFieldTouched(formKey, true, false);
      }}
      placeholder="Search by name or user ID (min 3 chars)"
      required
      {...autocompleteProps}
    />
  );
}