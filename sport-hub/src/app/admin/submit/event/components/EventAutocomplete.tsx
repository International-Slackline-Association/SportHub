'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormikContext } from 'formik';
import { EventSubmissionFormValues } from '../types';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { EventMetadataRecord } from '@lib/relational-types';

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
    select: (data) => data.filter((ev: { eventName: string }) =>
      ev.eventName.toLowerCase().includes(debounced.toLowerCase())
    ),
  });

  return (
    <FormikAutocomplete
      id="event.name"
      isLoading={isLoading}
      isError={isError}
      label="Event Name"
      options={events?.map(({ eventId, eventName }: EventMetadataRecord) => ({ label: eventName, value: eventId })) || []}
      onSelectOption={(optionValue: string) => {
        const event = events.find(({ eventId }: EventMetadataRecord) => eventId === optionValue);
        if (!event) return;
        setValues({
          event: {
            name: event.eventName,
            city: event.location || '',
            country: event.country.toUpperCase(),
            date: event.startDate,
            website: '',
            socialMedia: {},
            disciplines: [],
            avatarUrl: '',
            thumbnailUrl: event.thumbnailUrl || ''
          }
        });
      }}
      placeholder="Enter event name (min 3 chars)"
      required
    />
  );
}