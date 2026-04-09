'use client';

import { useState, useEffect, useRef } from 'react';
import { Option } from '.';
import styles from './styles.module.css';
import React from 'react';

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

export interface AutocompleteProps {
  /** The stored filter/field value — used to resolve the display text. */
  value?: string;
  /** Called with the new value when user selects an option or clears the input. */
  onChange?: (value: string) => void;
  options: Option[];
  id?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /**
   * Computes the display string from the stored value and the options list.
   * Defaults to: find matching option → show its label; else show raw value.
   */
  getDisplayValue?: (value: string, options: Option[]) => string;
}

const defaultGetDisplayValue = (value: string, options: Option[]) => {
  const match = options.find((o) => o.value === value?.trim());
  return match ? match.label : (value ?? '');
};

/**
 * Standalone autocomplete input — no Formik dependency.
 * Drives its own `inputText` state and calls `onChange` when the user
 * selects an option or clears the text.
 */
export default function Autocomplete({
  value = '',
  onChange,
  options,
  id,
  placeholder,
  className,
  disabled,
  getDisplayValue,
}: AutocompleteProps) {
  const resolveDisplay = getDisplayValue ?? defaultGetDisplayValue;
  const [inputText, setInputText] = useState(() => resolveDisplay(value, options));
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display text when the external value changes (e.g., filter reset)
  useEffect(() => {
    setInputText(resolveDisplay(value, options));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(({ label }) =>
    label.toLowerCase().includes((inputText || '').toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    setIsOpen(true);
    // If user clears the input, propagate empty value to clear the filter
    if (!text) {
      onChange?.('');
    }
  };

  const handleSelect = (option: Option) => {
    setInputText(option.label);
    setIsOpen(false);
    onChange?.(option.value);
  };

  return (
    <div className={`${styles.autocompleteContainer} ${className ?? ''}`} ref={containerRef}>
      <div className={styles.inputContainer}>
        <input
          id={id}
          type="text"
          className={styles.input}
          value={inputText}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          autoComplete="off"
        />
        {isOpen && filteredOptions.length > 0 && (
          <div className={styles.dropdown}>
            <ul className={styles.dropdownList}>
              {filteredOptions.map(({ label, value: optValue }: Option) => (
                <React.Fragment key={`${label}-${optValue}`}>
                  <li className={styles.dropdownItem}>
                    <button
                      className={styles.dropdownButton}
                      type="button"
                      onClick={() => handleSelect({ label, value: optValue })}
                    >
                      {highlightMatch(label, inputText)}
                    </button>
                  </li>
                </React.Fragment>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
