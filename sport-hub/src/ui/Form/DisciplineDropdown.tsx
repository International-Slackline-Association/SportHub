'use client';

import { useState, useEffect, useRef } from 'react';
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
    <div className={cn('isa-field', className)}>
      <label htmlFor={id} className="isa-label">Discipline</label>
      <div className="isa-autocomplete" ref={containerRef}>
        <span className="isa-select">
          <button
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="isa-input text-left pr-10"
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
            ) : 'Select discipline'}
          </button>
        </span>
        <ul
          className="isa-autocomplete__list"
          hidden={!isOpen}
          role="listbox"
          style={{ width: 'max-content', minWidth: '100%', right: 'auto' }}
        >
          {SUPPORTED_DISCIPLINES.map((discipline) => {
            const { enumValue, name, Icon } = DISCIPLINE_DATA[discipline];
            return (
              <li key={`${name}-${enumValue}`} role="presentation">
                <button
                  className="isa-autocomplete__option w-full text-left"
                  onClick={() => handleSelect({ label: name, value: String(enumValue) })}
                  type="button"
                >
                  <span className="inline-flex shrink-0">
                    <Icon height={24} width={24} />
                  </span>
                  <span className="whitespace-nowrap">{name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
