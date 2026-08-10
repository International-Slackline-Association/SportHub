'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useFormikContext } from 'formik';
import { EventSubmissionFormValues } from '../../types';
import React from 'react';
import FormikAutocomplete from '@ui/Form/FormikAutocomplete';
import { EventMetadataRecord } from '@lib/relational-types';
import { getEvent } from '../../actions';
import { MAP_DISCIPLINE_ENUM_TO_NAME } from '@utils/consts';

const createNextTouchState = (numContests: number) => ({
  event: {
    eventName: true,
    city: true,
    country: true,
    startDate: true,
    endDate: true,
    website: true,
    links: true,
    disciplines: true,
    profileUrl: true,
    thumbnailUrl: true,
  },
  contests: Array(numContests).fill({
    startDate: true,
    endDate: true,
    discipline: true,
    gender: true,
    ageCategory: true,
    judgingSystem: true,
    contestSize: true,
    totalPrizeValue: true,
    judges: false,
    results: false,
  }),
});

export default function EventAutocomplete() {
  const { values, setTouched, setValues, setErrors } = useFormikContext<EventSubmissionFormValues>();
  const input = values.event.eventName || "";
  const [debounced, setDebounced] = useState(input);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  const { data: events, isLoading: isLoadingEvents, isError } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await fetch('/api/events')).json(),
    enabled: debounced.length >= 3,
    select: (data) => data.filter((ev: EventMetadataRecord) =>
      ev.eventName && ev?.eventName.toLowerCase().includes(debounced.toLowerCase())
    ),
  });

  const updateFormWithSelectedEvent = ({ value: eventId }: Option) => {
    getEvent(eventId).then(({ event }) => {
      if (!event) {
        console.error("Unable to populate event form for ", eventId);
        return;
      }

      const disciplines = [
        ...new Set(
          event.contests.flatMap(c =>
            MAP_DISCIPLINE_ENUM_TO_NAME[Number(c.discipline)]
          ).filter(Boolean)
        )
      ];

      const website = event.contests?.[0]?.infoUrl as string;
      
      const nextFormState = {
        event: {
          eventName: event.eventName,
          city: event.city ?? '',
          country: (event.country as string).toLowerCase(),
          startDate: event?.startDate,
          endDate: event?.endDate,
          // TODO Backend: Missing columns from EventMetadataRecord - need to add to DynamoDB and data model
          website,
          links: [],
          disciplines: Array.from(disciplines ?? []),
          profileUrl: event.profileUrl as string,
          thumbnailUrl: event.thumbnailUrl as string,
        },
        contests: event.contests.map(c => ({
          startDate: c.contestDate,
          endDate: c.contestDate,
          discipline: MAP_DISCIPLINE_ENUM_TO_NAME[Number(c.discipline)],
          gender: c.gender as Gender,
          ageCategory: c.ageCategory as AgeCategory,
          judgingSystem: "" as JudgingSystem,
          contestSize: c.contestSize as ContestType,
          totalPrizeValue: c.prize,
          judges: [],
          results: [],
        })),
      };
  
      setTouched(createNextTouchState(event.contests.length), false);
      setValues(nextFormState, false);
      setErrors({});
    });
  };

  return (
    <FormikAutocomplete
      id="event.eventName"
      isLoading={isLoadingEvents}
      isError={isError}
      label="Event Name"
      options={events?.map(({ eventId, eventName, startDate }: EventMetadataRecord) => {
        return ({
          label: `${eventName} ${startDate}` || "",
          value: eventId
        });
      }) || []}
      // Prevent the field from being set to eventId; we'll set name + other fields ourselves
      setFieldOnSelect={false}
      onSelectOption={updateFormWithSelectedEvent}
      placeholder="Enter event name (min 3 chars)"
      required
    />
  );
}