'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormikContext } from 'formik';
import { EventSubmissionFormValues } from '../../types';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { EventRecord } from '@lib/relational-types';
import { Option } from '@ui/Form';

export default function EventAutocomplete() {
  const { values, setTouched, setValues, setErrors } = useFormikContext<EventSubmissionFormValues>();
  const input = values.event.name;
  const [debounced, setDebounced] = useState(input);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data: events, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await fetch('/api/events')).json(),
    enabled: debounced.length >= 3,
    select: (data) => data.filter((ev: { name: string }) =>
      ev.name.toLowerCase().includes(debounced.toLowerCase())
    ),
  });

  const updateFormWithSelectedEvent = ({ value }: Option) => {
    const event = events.find(({ eventId }: EventRecord) => eventId === value);
    setTouched({
      event: {
        name: true,
        city: true,
        country: true,
        date: true,
        website: true,
        socialMedia: {
          facebook: true,
          instagram: true,
          tiktok: true,
          twitch: true,
          youtube: true,
        },
        disciplines: true,
        avatarUrl: true,
        thumbnailUrl: true,
      },
      contests: [...values.contests.map(() => ({}))],
    }, false);
    setValues({
      event: {
        name: event.name,
        city: event.city,
        country: event.country.toLowerCase(),
        date: event.date,
        website: event.website,
        socialMedia: event.socialMedia || {},
        disciplines: event.disciplines || [],
        avatarUrl: event.avatarUrl,
        thumbnailUrl: event.thumbnailUrl
      },
      contests: values.contests,
    }, false);
    setErrors({});
  };

  return (
    <FormikAutocomplete
      id="event.name"
      isLoading={isLoading}
      isError={isError}
      label="Event Name"
      options={events?.map(({ eventId, name }: EventRecord) => ({
        label: name,
        value: eventId
      })) || []}
      // Prevent the field from being set to eventId; we'll set name + other fields ourselves
      setFieldOnSelect={false}
      onSelectOption={updateFormWithSelectedEvent}
      placeholder="Enter event name (min 3 chars)"
      required
    />
  );
}