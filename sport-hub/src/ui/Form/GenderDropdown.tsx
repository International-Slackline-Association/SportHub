'use client';

import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';
import { cn } from '@utils/cn';

export interface GenderDropdownProps {
  className?: string;
  id?: string;
  includeAll?: boolean;
  initialValue?: Gender;
  onChange?: (value: Gender) => void;
}

const renderGenderIcon = (value: Gender) => {
  switch (value) {
    case 'MEN':
      return <Image src="/static/images/icons/gender-male.svg" alt="Male" width={12} height={12} />;
    case 'WOMEN':
      return <Image src="/static/images/icons/gender-female.svg" alt="Female" width={12} height={12} />;
    default:
      return null;
  }
};

export default function GenderDropdown({
  className,
  id,
  includeAll = true,
  initialValue = 'WOMEN',
  onChange,
}: GenderDropdownProps) {
  const [value, setValue] = useState<Gender>(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const options = [
    { value: 'MEN' as Gender, label: 'Men' },
    { value: 'WOMEN' as Gender, label: 'Women' }
  ];
  if (includeAll) {
    options.push({ value: 'ALL' as Gender, label: 'Mixed' });
  }

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
    setValue(option.value as Gender);
    onChange?.(option.value as Gender);
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
                  <div className="cluster gap-2">
                    {renderGenderIcon(option.value)}
                    {option.label}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
