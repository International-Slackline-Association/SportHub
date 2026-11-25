'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@utils/cn';
import { Gender } from '@ui/Badge';

export interface GenderDropdownProps {
  className?: string;
  id?: string;
  initialValue?: string;
  /** Controlled value, e.g. a table filter that can be reset from outside. */
  value?: string;
  onChange?: (value: string) => void;
}

const GenderDropdown = ({
  className,
  id,
  initialValue = 'WOMEN',
  options,
  onChange,
  value: controlledValue,
}: GenderDropdownProps & { options: Option[] }) => {
  const [internalValue, setValue] = useState(initialValue);
  const value = controlledValue ?? internalValue;
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
    <div className={cn('isa-field min-w-28', className)}>
      <label htmlFor={id} className="isa-label">Gender</label>
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
            {selectedOption ? <Gender value={selectedOption.value} /> : 'Select gender'}
          </button>
        </span>
        <ul className="isa-autocomplete__list" hidden={!isOpen} role="listbox" style={{ width: 'max-content', minWidth: '100%', right: 'auto' }}>
          {options.map((option) => (
            <li key={option.value} role="presentation">
              <button
                type="button"
                className="isa-autocomplete__option w-full text-left"
                onClick={() => handleSelect(option)}
              >
                <Gender value={option.value} />
              </button>
            </li>
          ))}
        </ul>
      </div>
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

export function RecordsGenderDropdown(props: GenderDropdownProps) {
  return (
    <GenderDropdown
      {...props}
      initialValue="All"
      options={[
        { value: 'All', label: 'All' },
        { value: 'MEN_ONLY', label: 'Men' },
        { value: 'WOMEN_ONLY', label: 'Women' },
        { value: 'MIXED', label: 'Mixed' }
      ]}
    />
  );
}
