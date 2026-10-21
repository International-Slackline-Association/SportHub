'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';
import { cn } from '@utils/cn';
import { Gender } from '@ui/Badge';

export interface GenderDropdownProps {
  className?: string;
  id?: string;
  initialValue?: string;
  onChange?: (value: string) => void;
}

const GenderDropdown = ({
  className,
  id,
  initialValue = 'WOMEN',
  options,
  onChange,
}: GenderDropdownProps & { options: Option[] }) => {
  const [value, setValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div className={cn(className, 'min-w-28')} ref={containerRef}>
      <label htmlFor={id} className={styles.label}>
        Gender
      </label>
      <button
        className={cn(styles.input, styles.dropdownTrigger, 'text-base')}
        id={id}
        onClick={() => setIsOpen((open) => !open)}
      >
        {selectedOption?.label ?? 'Select Gender'}
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
                  <Gender value={option.value} variant="normal" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export function RankingsGenderDropdown(props: GenderDropdownProps) {
  return (
    <GenderDropdown
      {...props}
      initialValue={props.initialValue ?? 'WOMEN'}
      options={[
        { value: 'MEN' as Gender, label: 'Men' },
        { value: 'WOMEN' as Gender, label: 'Women' }
      ]}
    />
  );
}

export function ContestsGenderDropdown(props: GenderDropdownProps) {
  return (
    <GenderDropdown
      {...props}
      initialValue="All"
      options={[
        { value: 'All' as Gender, label: 'All' },
        { value: 'Men' as Gender, label: 'Men' },
        { value: 'Women' as Gender, label: 'Women' },
        { value: 'Mixed' as Gender, label: 'Mixed' }
      ]}
    />
  );
}
