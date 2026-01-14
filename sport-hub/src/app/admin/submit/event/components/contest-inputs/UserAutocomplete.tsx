'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIn, useFormikContext } from 'formik';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { UserRecord } from '@lib/relational-types';
import { Option } from '@ui/Form';
import { ErrorMessage } from '../ErrorMessage';
import Spinner from '@ui/Spinner';

type UserField = {
  id: string;
  name?: string;
}

type Props = { id: string; onSelectOption?: (option: Option) => void };

export default function UserAutocomplete<TFormValues>({
  id,
  onSelectOption,
  ...autocompleteProps
}: Props) {
  const { values } = useFormikContext<TFormValues>();
  const current = getIn(values, id); // safe access
  const [debounced, setDebounced] = useState(current);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(current), 300);
    return () => clearTimeout(t);
  }, [current]);

  const { data: users, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await fetch('/api/users')).json(),
    // Enable only when user has typed at least 3 chars
    enabled: typeof debounced === 'string' && debounced.length >= 3,
    // Cache for 1 hour, consider data fresh for 10 minutes
    gcTime: 60 * 60 * 1000,
    staleTime: 10 * 60 * 1000,
    // Avoid automatic refetches since this component is used many times in a form
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    select: (data) => data.filter((ev: { name: string }) => {
      let inputName;
      if (typeof debounced == 'string') {
        inputName = debounced.toLowerCase();
      } else {
        inputName = debounced?.name?.toLowerCase() || '';
      }
      return ev.name.toLowerCase().includes(inputName);
    }),
  });
console.log("debounced", debounced);

  const userOptions = users?.map(({ name, userId }: UserRecord) => ({
    label: name,
    value: userId
  })) || [];

  if (isError) {
    return <ErrorMessage>Error loading users for autocomplete.</ErrorMessage>;
  }

  return (
    <FormikAutocomplete
      id={id}
      isLoading={isLoading}
      hideErrorMessage
      getDisplayValue={(fieldValue: unknown, options: Option[]) => {
        if (typeof fieldValue === "string") {
          return fieldValue;
        }

        const match = options.find((o) => o.value === (fieldValue as Option)?.value);
        if (match) {
          return match.label;
        }

        return "";
      }}
      label="Name"
      mapOptionToValue={(o) => o.label}
      options={userOptions}
      onSelectOption={onSelectOption}
      placeholder="Enter user name (min 3 chars)"
      required
      {...autocompleteProps}
    />
  );
}