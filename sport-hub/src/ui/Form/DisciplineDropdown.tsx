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

  const selectedKey = SUPPORTED_DISCIPLINES.find(d => String(DISCIPLINE_DATA[d].enumValue) === value) ?? 'OVERALL';
  const selected = DISCIPLINE_DATA[selectedKey];
  return (
    <div className={className} ref={containerRef}>
      <label htmlFor={id} className={styles.label}>
        Discipline
      </label>
      <button
        className={cn(styles.input, styles.dropdownTrigger, 'text-base')}
        id={id}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        {selected ? (
          <span className="cluster items-center gap-2">
            {selectedKey !== 'OVERALL' && (
              <span className="inline-flex shrink-0">
                <selected.Icon height={24} width={24} />
              </span>
            )}
            {selected.name}
          </span>
        ) : 'Select Discipline'}
      </button>
      {isOpen && (
        <div className={cn(styles.dropdown, styles.dropdownWide)}>
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
                      <div className="cluster items-center gap-2">
                        <span className="inline-flex shrink-0">
                          <Icon height={24} width={24} />
                        </span>
                        <span className="whitespace-nowrap">{name}</span>
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
