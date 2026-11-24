'use client';

import { useEffect, useRef, useState } from 'react';
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
    <div className={cn('isa-field min-w-40', className)}>
      <label htmlFor={id} className="isa-label">Size</label>
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
            {selectedOption?.value === 'ALL' || !selectedOption
              ? (selectedOption?.label ?? 'Select size')
              : <ContestSize value={selectedOption.value as ContestType} />}
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
                {option.value === "ALL"
                  ? "All"
                  : <ContestSize value={option.value as ContestType} />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
