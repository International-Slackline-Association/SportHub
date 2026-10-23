'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';
import { cn } from '@utils/cn';
import { ContestSize } from '@ui/Badge';
import { contestSizeOptions } from './commonOptions';

export interface ContestSizeDropdownProps {
  className?: string;
  id?: string;
  includeAll?: boolean;
  initialValue?: string;
  onChange?: (value: string) => void;
}

const ALL_OPTION: Option = { value: 'ALL', label: 'All' };

export default function ContestSizeDropdown({
  className,
  id,
  includeAll = true,
  initialValue,
  onChange,
}: ContestSizeDropdownProps) {
  const defaultValue = initialValue ?? (includeAll ? 'ALL' : contestSizeOptions[0]?.value);
  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = includeAll ? [ALL_OPTION, ...contestSizeOptions] : contestSizeOptions;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    setIsOpen(false);
    setValue(option.value);
    onChange?.(option.value);
  };

  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  return (
    <div className={cn(className, 'min-w-40')} ref={containerRef}>
      <label htmlFor={id} className={styles.label}>
        Size
      </label>
      <button
        className={cn(styles.input, styles.dropdownTrigger, 'text-base')}
        id={id}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {selectedOption?.label ?? 'Select Size'}
      </button>

      {isOpen && (
        <div className={cn(styles.dropdown)}>
          <ul>
            {options.map((option) => (
              <li key={option.value} className={styles.dropdownItem}>
                <button
                  type="button"
                  className={cn(styles.dropdownButton)}
                  onClick={() => handleSelect(option)}
                >
                  {option.value === "ALL"
                    ? "All"
                    : <ContestSize value={option.value as ContestType} variant="normal" />
                  }
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
