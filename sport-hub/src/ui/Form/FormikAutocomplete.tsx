'use client';

import { useState, useEffect, useRef } from 'react';
import { FormikFieldProps, FormikFormField, Option } from ".";
import { BaseFormFieldProps } from '@ui/Form';
import { Field, useFormikContext } from 'formik';
import styles from './styles.module.css';
import React from 'react';

interface FormikAutocompleteProps extends BaseFormFieldProps<HTMLInputElement> {
  isError?: boolean;
  isLoading?: boolean;
  onSelectOption?: (value: string) => void;
  options: Option[];
}

const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className={styles.highlight}>{part}</mark>
    ) : (
      part
    )
  );
};

export default function FormikAutocomplete<FormValues>({
  className,
  id,
  isError = false,
  isLoading = false,
  label,
  onSelectOption,
  options,
  ...inputProps
}: FormikAutocompleteProps) {
  const { setFieldValue } = useFormikContext<FormValues>();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className={styles.autocompleteContainer} ref={containerRef}>
      <FormikFormField className={className} id={id} label={label}>
        <Field name={id}>
          {({ field, meta }: FormikFieldProps<string>) => {
            const filteredOptions = options.filter(({ label }) =>
              label.toLowerCase().includes((field.value || "").toLowerCase())
            );
            return (
              <div className={styles.inputContainer}>
                <input
                  {...field}
                  {...inputProps}
                  className={`${styles.input} ${meta.touched && meta.error ? styles.error : ''}`}
                  id={id}
                  name={id}
                  type="text"
                  value={field.value || ""}
                  onFocus={() => setIsOpen(true)}
                />
                {isOpen && filteredOptions.length > 0 && (
                  <div className={styles.dropdown}>
                    <ul className={styles.dropdownList}>
                      {isLoading && <div className={styles.dropdownMessage}>Loading…</div>}
                      {isError && <div className={styles.dropdownMessage}>Error loading options</div>}
                      {!isLoading && !isError && (
                        filteredOptions.map(({ label, value }: Option) => (
                          <React.Fragment key={value}>
                            <li className={styles.dropdownItem}>
                              <button
                                className={styles.dropdownButton}
                                onClick={() => {
                                  setFieldValue(id || "", value);
                                  setIsOpen(false);
                                  onSelectOption?.(value);
                                }}
                                type="button"
                              >
                                {highlightMatch(label, field.value)}
                              </button>
                            </li>
                          </React.Fragment>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            );
          }}
        </Field>
      </FormikFormField>
    </div>
  );
}