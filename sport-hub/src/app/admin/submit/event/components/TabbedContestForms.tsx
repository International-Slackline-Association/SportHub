'use client';

import { FieldArray, useFormikContext } from 'formik';
import { EventSubmissionFormValues, initialContestValues } from '../types';
import { cn } from '@utils/cn';
import styles from './styles.module.css';
import Button from '@ui/Button';
import { TabGroup } from '@ui/Tab';
import { useState } from 'react';
import ContestForm from './ContestForm';

export default function TabbedContestForms() {
  const { dirty, errors, isValid, values: { contests } } = useFormikContext<EventSubmissionFormValues>();
  const [activeContestIdx, setActiveContestIdx] = useState<string | undefined>(String(contests.length - 1));

  const tabs = contests.map((_, idx) => ({
    id: String(idx), label: `Contest ${idx + 1}`
  }));

  const activeContestHasErrors = Object.keys(errors.contests?.[Number(activeContestIdx)] || {}).length > 0;
  const isError = dirty && !isValid && activeContestHasErrors;
  const contestLabel = `Contest ${Number(activeContestIdx) + 1}`;
console.log({ errors });

  return (
    <div className={styles.eventForm}>
      {isError && (
        <div className={cn(styles.validationHint, styles.error)}>
          Missing or invalid values in {contestLabel} form.
        </div>
      )}
      <FieldArray name="contests">
        {({ push, remove }) => (
          <>
            <div className="cluster justify-between">
              <TabGroup
                activeTab={activeContestIdx}
                onTabChange={setActiveContestIdx}
                tabs={tabs}
                variant="secondary"
              />
              <Button
                onClick={() => {
                  push(initialContestValues);
                  setActiveContestIdx(String(contests.length));
                }}
                type="button"
                variant="secondary"
              >
                Add Contest
              </Button>
            </div>
            {contests.length > 0 && (
              <ContestForm contestIdx={activeContestIdx || ""} onRemove={(index) => remove(Number(index))} />
            )}
          </>
        )}
      </FieldArray>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <details className={styles.debugInfo}>
          <summary>Contest Form State (Debug)</summary>
          <pre>contests = {JSON.stringify(contests, null, 2)}</pre>
          <pre>errors = {JSON.stringify(errors.contests, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
