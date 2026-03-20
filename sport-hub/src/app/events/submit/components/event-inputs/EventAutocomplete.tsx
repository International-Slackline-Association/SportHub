'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormikContext } from 'formik';
import { EventSubmissionFormValues } from '../../types';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { EventMetadataRecord } from '@lib/relational-types';
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
    select: (data) => data.filter((ev: EventMetadataRecord) =>
      ev.eventName.toLowerCase().includes(debounced.toLowerCase())
    ),
  });

  const updateFormWithSelectedEvent = ({ value }: Option) => {
    const event: EventMetadataRecord = events.find(({ eventId }: EventMetadataRecord) => eventId === value);

    const nextTouchState = {
      event: {
        name: true,
        city: true,
        country: true,
        startDate: true,
        endDate: true,
        website: true,
        socialMedia: {
          facebook: true,
          instagram: true,
          tiktok: true,
          twitch: true,
          youtube: true,
        },
        disciplines: true,
        profileUrl: true,
        thumbnailUrl: true,
      },
      contests: [...values.contests.map(() => ({}))],
    };

    const nextFormState = {
      event: {
        name: event.eventName,
        city: event.city ?? '',
        country: event.country.toLowerCase(),
        startDate: event?.startDate,
        endDate: event?.endDate,
        // TODO Backend: Missing columns from EventMetadataRecord - need to add to DynamoDB and data model
        website: "",
        socialMedia: {},
        disciplines: [],
        profileUrl: event.profileUrl,
        thumbnailUrl: event.thumbnailUrl,
      },
      contests: values.contests,
    };

    setTouched(nextTouchState, false);
    setValues(nextFormState, false);
    setErrors({});
  };

  return (
    <FormikAutocomplete
      id="event.name"
      isLoading={isLoading}
      isError={isError}
      label="Event Name"
      options={events?.map(({ eventId, eventName }: EventMetadataRecord) => ({
        label: eventName,
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