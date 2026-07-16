'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './styles.module.css';
import React from 'react';
import { DISCIPLINE_DATA, SUPPORTED_DISCIPLINES as _SUPPORTED_DISCIPLINES } from '@utils/consts';
import { cn } from '@utils/cn';

export interface DisciplineDropdownProps {
  className?: string;
  id?: string;
  includeAll?: boolean;
  initialValue?: string;
  onChange?: (value: string) => void;
}

export default function DisciplineDropdown({
  includeAll = false,
  initialValue = "0",
  onChange,
  id,
  className,
}: DisciplineDropdownProps) {
  const [value, setValue] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (option: Option) => {
    setIsOpen(false);
    setValue(option.value);
    onChange?.(option.value);
  };

  const SUPPORTED_DISCIPLINES: Discipline[] = includeAll ? ['OVERALL', ..._SUPPORTED_DISCIPLINES] : _SUPPORTED_DISCIPLINES;

  const displayValue = DISCIPLINE_DATA[SUPPORTED_DISCIPLINES.find(d => String(DISCIPLINE_DATA[d].enumValue) === value) ?? 'OVERALL']?.name ?? 'Select Discipline';
  return (
    <div className={className} ref={containerRef}>
      <label htmlFor={id} className={styles.label}>
        Discipline
      </label>
      <input
        className={"text-base"}
        id={id}
        onFocus={() => setIsOpen(true)}
        readOnly
        type="text"
        value={displayValue}
      />
      {isOpen && (
        <div className={cn(styles.dropdown)}>
          <ul className={styles.dropdownList}>
            {SUPPORTED_DISCIPLINES.map((discipline) => {
              const { enumValue, name, Icon } = DISCIPLINE_DATA[discipline];
              return (
                <React.Fragment key={`${name}-${enumValue}`}>
                  <li className={styles.dropdownItem}>
                    <button
                      className={styles.dropdownButton}
                      onClick={() => handleSelect({ label: name, value: String(enumValue) })}
                      type="button"
                    >
                      <div className="cluster gap-2">
                        <Icon height={24} width={24} />
                        {name}
                      </div>
                    </button>
                  </li>
                </React.Fragment>
              );
          })}
          </ul>
        </div>
      )}
    </div>
  );
}
