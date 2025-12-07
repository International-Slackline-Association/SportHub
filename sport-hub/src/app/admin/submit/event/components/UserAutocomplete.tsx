'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getIn, useFormikContext } from 'formik';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { UserRecord } from '@lib/relational-types';

type Props = { id: string };
export default function UserAutocomplete<TFormValues>({ id }: Props) {
  const { values, setFieldValue } = useFormikContext<TFormValues>();
  const current = getIn(values, id); // safe access
  const [debounced, setDebounced] = useState(current);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(current), 300);
    return () => clearTimeout(t);
  }, [current]);

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await fetch('/api/users')).json(),
    enabled: debounced?.length >= 3,
    select: (data) => data.filter((ev: { name: string }) =>
      ev.name.toLowerCase().includes(debounced.toLowerCase())
    ),
  });

  const userOptions = users?.map(({ userId, name }: UserRecord) => ({
    label: name,
    value: userId
  })) || [];

  return (
    <FormikAutocomplete
      id={id}
      isLoading={isLoading}
      isError={isError}
      label="Name"
      options={userOptions}
      placeholder="Enter user name (min 3 chars)"
      required
    />
  );
}