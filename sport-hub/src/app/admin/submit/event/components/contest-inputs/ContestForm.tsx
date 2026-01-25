'use client';

import { cn } from '@utils/cn';
import { EventSubmissionFormValues } from '../../types';
import { GeneralInformation } from './GeneralInformation';
import { Judges } from './Judges';
import { Results } from './Results';
import { TabGroup } from '@ui/Tab';
import { FormikErrors, getIn, useFormikContext } from 'formik';
import { useState } from 'react';
import Button from '@ui/Button';
import sharedStyles from '../styles.module.css';
import styles from './styles.module.css';
import { ErrorMessage } from '../ErrorMessage';
import { getContestNameFromForm } from './TabbedContestForms';

type Props = {
  contestIdx: number;
  onRemove: () => void;
}

const parseErrorsForContest = (errors: FormikErrors<EventSubmissionFormValues>, contestKey: string) => {
  const contestErrors = getIn(errors, contestKey) || {};
  const contestHasJudgesError = !!contestErrors?.judges;
  const contestHasResultsError = !!contestErrors?.results;
  const contestHasGeneralErrors =
    contestErrors.discipline ||
    contestErrors.gender ||
    contestErrors.ageCategory ||
    contestErrors.judgingSystem ||
    contestErrors.contestSize ||
    contestErrors.totalPrizeValue;

  const errorMessages = [];

  if (contestHasGeneralErrors) {
    errorMessages.push("Error in contest general info");
  }

  if (contestHasJudgesError) {
    if (typeof contestErrors?.judges === 'string') {
      errorMessages.push(contestErrors?.judges);
    } else {
      errorMessages.push("Error in contest judges");
    }
  }

  if (contestHasResultsError) {
    if (typeof contestErrors?.results === 'string') {
      errorMessages.push(contestErrors?.results);
    } else {
      errorMessages.push("Error in contest results");
    }
  }

  return errorMessages.length > 0 ? (
    <div className="text-start">
      {errorMessages.map((msg, idx) => (
        <div key={idx}>{msg}</div>
      ))}
    </div>
  ) : null;
};

export default function ContestForm({ contestIdx, onRemove }: Props) {
  const { errors, touched, values } = useFormikContext<EventSubmissionFormValues>();
  const [activeTab, setActiveTab] = useState('GENERAL_INFO');

  const contestKey = `contests[${contestIdx}]`;
  const currentContest = getIn(values, contestKey) || {};
  const { judges = [], results = [] } = currentContest;

  const errorMessage = parseErrorsForContest(errors, contestKey);
  const contestHasErrors = errorMessage !== null;
  const contestIsTouched = getIn(touched, `contests[${contestIdx}]`);

  return (
    <>
      <section className={cn("stack", "gap-4", "my-4", sharedStyles.sectionContent)}>
        {contestIsTouched && contestHasErrors && (
          <ErrorMessage>{errorMessage}</ErrorMessage>
        )}
        <div className={cn(styles.contestFormHeader)}>
          <h3>{getContestNameFromForm(values, contestIdx)}</h3>
          <TabGroup
            activeTab={activeTab}
            className={sharedStyles.borderBottom}
            onTabChange={setActiveTab}
            tabs={[
              { id: 'GENERAL_INFO', label: 'General Information' },
              { id: 'JUDGES', label: 'Judges' },
              { id: 'RESULTS', label: 'Results' },
            ]}
            variant="primary"
          />
        </div>
        {activeTab === 'GENERAL_INFO' && (
          <GeneralInformation contestKey={contestKey} />
        )}
        {activeTab === 'JUDGES' && (
          <Judges contestKey={contestKey} judges={judges} />
        )}
        {activeTab === 'RESULTS' && (
          <Results contestKey={contestKey} results={results} />
        )}
      </section>
      <div className={cn('cluster', 'items-center', 'gap-4', 'justify-end')}>
        <Button
          type="button"
          variant="destructive-secondary"
          onClick={onRemove}
        >
          Delete Contest
        </Button>
        <Button
          disabled={contestHasErrors}
          onClick={() => {}}
          type="button"
          variant="secondary"
        >
          Duplicate Contest
        </Button>
      </div>
    </>
  );
}
