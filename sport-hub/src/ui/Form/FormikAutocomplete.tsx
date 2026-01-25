'use client';

import { useState, useEffect, useRef } from 'react';
import { FormikFieldProps, FormikFormField, Option } from ".";
import { BaseFormFieldProps } from '@ui/Form';
import { Field } from 'formik';
import styles from './styles.module.css';
import React from 'react';
import Spinner from '@ui/Spinner';

export interface FormikAutocompleteProps extends BaseFormFieldProps<HTMLInputElement> {
  hideErrorMessage?: boolean;
  isError?: boolean;
  isLoading?: boolean;
  options: Option[];
  onSelectOption?: (option: Option) => void;
  // If true (default), the field value is updated on select using mapOptionToValue
  setFieldOnSelect?: boolean;
  // Maps an Option to the value stored in the form field. Defaults to option.value
  mapOptionToValue?: (option: Option) => unknown;
  // Computes the input display string from the current field value
  // Defaults to: match option by value -> label; else if string, use it; otherwise empty
  getDisplayValue?: (value: unknown, options: Option[]) => string;
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

/**
 * Autocomplete connected to Formik form state.
 * Capable of handling string or complex field value types.
 */
export default function FormikAutocomplete({
  caption,
  className,
  hideErrorMessage = false,
  id,
  isError = false,
  isLoading = false,
  label,
  options,
  onSelectOption,
  setFieldOnSelect = true,
  mapOptionToValue,
  getDisplayValue,
  required,
  ...inputProps
}: FormikAutocompleteProps) {
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
  console.log("FormikAutocomplete options", options);

  return (
    <div className={styles.autocompleteContainer} ref={containerRef}>
      <FormikFormField
        caption={caption}
        className={className}
        id={id}
        label={
          <div>
            {isLoading && <Spinner size="small" className="inline-block mr-2" />}
            {label}
          </div>
        }
        required={required}
      >
        <Field name={id}>
          {({ field, meta, form }: FormikFieldProps<unknown>) => {
            const toFormValue = mapOptionToValue || ((opt: Option) => opt.value);
            const toDisplay =
              getDisplayValue ||
              ((value: unknown, opts: Option[]) => {
                const match = opts.find((o) => o.value === (value as string)?.trim());
                if (match) return match.label;
                return typeof value === 'string' ? value : '';
              });

            const inputText = toDisplay(field.value, options);
            const filteredOptions = options.filter(({ label }) =>
              label.toLowerCase().includes((inputText || "").toLowerCase())
            );
            const hasError = isError || (meta.touched && Boolean(meta.error));
            const errorText = typeof meta.error === 'string' ? meta.error : undefined;

            return (
              <div className={styles.inputContainer}>
                <input
                  // Keep Formik wiring for name/id, but control value via computed display
                  name={id}
                  {...inputProps}
                  className={`
                    ${styles.input}
                    ${meta.touched && meta.error && !hideErrorMessage ? styles.error : ''}
                  `}
                  id={id}
                  type="text"
                  value={inputText}
                  onChange={(e) => {
                    // Let users type to filter; store the raw text in the field for simple string flows
                    form.setFieldValue(id, e.target.value);
                    form.setFieldTouched(id, true, false);
                  }}
                  onFocus={() => setIsOpen(true)}
                />
                {isOpen && filteredOptions.length > 0 && (
                  <div className={styles.dropdown}>
                    <ul className={styles.dropdownList}>
                      {isLoading && <div className={styles.dropdownMessage}>Loading…</div>}
                      {isError && <div className={styles.dropdownMessage}>Error loading options</div>}
                      {!isLoading && !isError && (
                        filteredOptions.map(({ label, value }: Option) => (
                          <React.Fragment key={`${label}-${value}`}>
                            <li className={styles.dropdownItem}>
                              <button
                                className={styles.dropdownButton}
                                onClick={() => {
                                  const option = { label, value };
                                  if (setFieldOnSelect) {
                                    const newValue = toFormValue(option);
                                    form.setFieldValue(id, newValue, true);
                                    form.setFieldTouched(id, true, false);
                                  }
                                  onSelectOption?.(option);
                                  setIsOpen(false);
                                }}
                                type="button"
                              >
                                {highlightMatch(label, inputText)}
                              </button>
                            </li>
                          </React.Fragment>
                        ))
                      )}
                    </ul>
                  </div>
                )}
                {!hideErrorMessage && hasError && errorText && (
                  <div className={styles.errorMessage}>
                    {errorText}
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