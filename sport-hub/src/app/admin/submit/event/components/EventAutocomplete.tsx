'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormikContext } from 'formik';
import { EventSubmissionFormValues } from '../types';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { EventRecord } from '@lib/relational-types';

export default function EventAutocomplete() {
  const { values, setValues } = useFormikContext<EventSubmissionFormValues>();
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

  return (
    <FormikAutocomplete
      id="event.name"
      isLoading={isLoading}
      isError={isError}
      label="Event Name"
      options={events?.map(({ eventId, name }: EventRecord) => ({ label: name, value: eventId })) || []}
      onSelectOption={(optionValue: string) => {
        const event = events.find(({ eventId }: EventRecord) => eventId === optionValue);
        setValues({
          event: {
          name: event.name,
            city: event.city,
            country: event.country.toUpperCase(),
            date: event.date,
            website: event.website,
            socialMedia: event.socialMedia || {},
            disciplines: event.disciplines || [],
            avatarUrl: event.avatarUrl,
            youtubeVideo: event.youtubeVideo
          }
        });
      }}
      placeholder="Enter event name (min 3 chars)"
      required
    />
  );
}