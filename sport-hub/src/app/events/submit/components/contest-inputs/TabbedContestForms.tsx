'use client';

import { FieldArray, getIn, useFormikContext } from 'formik';
import { EventSubmissionFormValues, initialContestValues } from '../../types';
import sharedStyles from '../styles.module.css';
import Button from '@ui/Button';
import { TabGroup } from '@ui/Tab';
import { useState } from 'react';
import ContestForm from './ContestForm';
import { cn } from '@utils/cn';
import { snakeCaseToTitleCase } from '@utils/strings';

export const getContestNameFromForm = (formValues: EventSubmissionFormValues, contestIdx: number) => {
  const contestKey = `contests[${contestIdx}]`;
  const displayDiscipline = snakeCaseToTitleCase(getIn(formValues, `${contestKey}.discipline`));
  const displayContestSize = snakeCaseToTitleCase(getIn(formValues, `${contestKey}.contestSize`));
  const displayGender = snakeCaseToTitleCase(getIn(formValues, `${contestKey}.gender`));
  const displayName = formValues.event.name || `Contest ${contestIdx + 1}`;
  return `${displayName} ${displayGender} ${displayDiscipline} ${displayContestSize}`.trim();
};

export default function TabbedContestForms() {
  const { errors, touched, values, validateField } = useFormikContext<EventSubmissionFormValues>();
  const { contests } = values;
  const [activeContestIdx, setActiveContestIdx] = useState((contests?.length || 0) - 1);

  const tabs = contests.map((_, idx) => ({
    id: String(idx), label: getContestNameFromForm(values, idx),
  }));

  const contestErrors = getIn(errors, "contests") || {};
  const contestHasErrors = Object.keys(contestErrors).length > 0;

  const isCurrentContestTouched = getIn(touched, `contests[${activeContestIdx}]`);

  return (
    <div>
      <FieldArray name="contests" validateOnChange={false}>
        {({ push, remove }) => {
          const contestKey = `contests[${activeContestIdx}]`;

          const createNewContest = () => {
            push(initialContestValues);
            setActiveContestIdx(activeContestIdx + 1);
          };

          const duplicateCurrentContest = () => {
            const current = contests[activeContestIdx];
            push(JSON.parse(JSON.stringify(current)));
            setActiveContestIdx(contests.length);
          };

          const handleClickAddContest = async () => {
            if (contests.length <= 0) {
              createNewContest();
              return;
            }

            const currentContestErrors = await validateField(contestKey);

            if (!currentContestErrors) {
              createNewContest();
            } else {
              alert("Please fix errors in the current contest form before adding a new contest.");
            }
          };

          return (
            <>
              <div className={cn(tabs.length === 0 && sharedStyles.sectionContent, "cluster", "justify-between", "items-center")}>
                {tabs.length === 0 && (
                  <div>
                    No contests. Click &quot;Add Contest&quot; to create one.
                  </div>
                )}
                <TabGroup
                  activeTab={String(activeContestIdx)}
                  onTabChange={(newTabId) => setActiveContestIdx(Number(newTabId))}
                  tabs={tabs}
                  variant="secondary"
                />
                <Button
                  disabled={contests.length > 0 && (!isCurrentContestTouched || contestHasErrors)}
                  onClick={handleClickAddContest}
                  type="button"
                  variant="secondary"
                >
                  Add Contest
                </Button>
              </div>
              {contests.length > 0 && (
                <ContestForm
                  contestIdx={activeContestIdx}
                  onDuplicate={duplicateCurrentContest}
                  onRemove={() => {
                    remove(activeContestIdx);
                    setActiveContestIdx(activeContestIdx - 1);
                  }}
                />
              )}
            </>
          );
        }}
      </FieldArray>

      {/* Debug info - remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <details className={sharedStyles.debugInfo}>
          <summary>Contest Form State (Debug)</summary>
          <pre>contests = {JSON.stringify(contests, null, 2)}</pre>
          <pre>errors = {JSON.stringify(errors.contests, null, 2)}</pre>
          <pre>touched = {JSON.stringify(touched.contests, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
