'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BaseFormFieldProps, FormikTextField } from '@ui/Form';
import { useFormikContext } from 'formik';
import { EventSubmissionFormValues } from '../types';
import styles from './styles.module.css';
import React from 'react';

interface EventAutocompleteProps extends BaseFormFieldProps {
  onSelect?: (item: any) => void;
}

export default function EventAutocomplete({ onSelect }: EventAutocompleteProps) {
  const { values, setFieldValue } = useFormikContext<EventSubmissionFormValues>();
  const input = values.event.name;
  const [debounced, setDebounced] = useState(input);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // simple debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(t);
  }, [input]);

  // close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: events, isLoading, isError, isSuccess } = useQuery({
    queryKey: ['events'],
    queryFn: async () => (await fetch('/api/events')).json(),
    enabled: debounced.length >= 3,
    select: (data) => data.filter((ev: { name: string }) =>
      ev.name.toLowerCase().includes(debounced.toLowerCase())
    ),
    staleTime: 1000 * 60 * 5
  });

  const hasEvents = isSuccess && events && events.length > 0;

  useEffect(() => {
    // open dropdown when results arrive
    if (hasEvents && debounced.length >= 3) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [hasEvents, debounced]);

  const handleSelect = (item: { id: string; name: string }) => {
    setFieldValue('event.name', item.name);
    setIsOpen(false);
    onSelect?.(item);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={index} className={styles.highlight}>{part}</mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className={styles.autocompleteContainer} ref={containerRef}>
      <FormikTextField
        id="event.name"
        label="Event Name"
        placeholder="Enter event name (min 3 chars)"
        required
      />
      {isOpen && hasEvents && (
        <div className={styles.dropdown}>
          {isLoading && <div className={styles.dropdownMessage}>Loading…</div>}
          {isError && <div className={styles.dropdownMessage}>Error loading events</div>}
          {isSuccess && (
            <ul className={styles.dropdownList}>
              {events.map((eventData: any) => (
                <React.Fragment key={eventData.eventId}>
                  <li className={styles.dropdownItem}>
                    <button
                      type="button"
                      onClick={() => handleSelect(eventData)}
                      className={styles.dropdownButton}
                    >
                      {highlightMatch(eventData.name, debounced)}
                    </button>
                  </li>
                </React.Fragment>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}