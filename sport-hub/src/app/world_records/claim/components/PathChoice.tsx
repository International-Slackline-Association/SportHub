'use client';

/** "What are you claiming?": a record in an existing or a new category, or a first. */

import formStyles from '@ui/Form/styles.module.css';
import { Alert } from '@ui/Alert';
import { RECORDS_TEAM_EMAIL } from '@lib/records-rules';
import type { ClaimPath } from '../types';
import { Section } from './ClaimSections';

const PATH_OPTIONS: { value: ClaimPath; label: string }[] = [
  { value: 'existing', label: 'A world record in an existing category' },
  { value: 'new_category', label: 'A world record in a new category' },
  { value: 'first', label: 'A world first (a new trick)' },
];

export const kindOf = (path: ClaimPath) => (path === 'first' ? 'first' : 'record');

type Props = {
  path: ClaimPath;
  onChange: (path: ClaimPath) => void;
  /** A saved claim keeps its kind: a record can't become a first. */
  locked: boolean;
  /** Shows the hint to announce a record attempt by email. */
  showAttemptHint?: boolean;
};

export default function PathChoice({ path, onChange, locked, showAttemptHint = true }: Props) {
  const options = locked ? PATH_OPTIONS.filter(o => kindOf(o.value) === kindOf(path)) : PATH_OPTIONS;
  return (
    <Section title="What are you claiming?">
      <div className={formStyles.verticalGroup}>
        {options.map(option => (
          <div className={formStyles.checkboxField} key={option.value}>
            <label htmlFor={`path-${option.value}`} className={formStyles.label}>{option.label}</label>
            <input
              className={formStyles.checkbox}
              checked={path === option.value}
              id={`path-${option.value}`}
              name="path"
              type="radio"
              value={option.value}
              onChange={() => onChange(option.value)}
            />
          </div>
        ))}
      </div>
      {/* FR-1: attempts are announced by email, not in the app (v1) */}
      {showAttemptHint && path !== 'first' && (
        <Alert variant="info" size="SM" showIcon={false}>
          <p>
            Planning a record attempt? As the ISA framework asks, email <a href={`mailto:${RECORDS_TEAM_EMAIL}`} className="underline">{RECORDS_TEAM_EMAIL}</a> before the attempt, so the definitions can be agreed in advance.
          </p>
        </Alert>
      )}
    </Section>
  );
}
