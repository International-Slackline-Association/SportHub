'use client';

import { FieldArray, getIn, useFormikContext } from 'formik';
import {
  FormikSelectField,
  FormikTextField,
  disciplineOptions,
  ageCategoryOptions,
  judgingSystemOptions,
  contestSizeOptions,
  eventGenderOptions,
  FormikRadioGroup,
  FormikNumberField,
} from '@ui/Form';
import { EventSubmissionFormValues } from '../types';
import { cn } from '@utils/cn';
import styles from './styles.module.css';
import Button from '@ui/Button';
import { useState } from 'react';
import { TabGroup } from '@ui/Tab';
import { TrashIcon } from '@ui/Icons';
import UserAutocomplete from './UserAutocomplete';

type Props = {
  contestIdx: string;
  onRemove: (index: string) => void;
}

export default function ContestForm({ contestIdx, onRemove }: Props) {
  const { values, setFieldTouched, setFieldValue, touched } = useFormikContext<EventSubmissionFormValues>();
  const [activeTab, setActiveTab] = useState('GENERAL_INFO');

  const contestKey = `contests[${contestIdx}]`;
  const contestLabel = `Contest ${Number(contestIdx) + 1}`;
  const { judges = [] } = values.contests[Number(contestIdx)];
console.log(touched);

  return (
    <>
      <section className={cn("stack", "gap-4", styles.sectionContent)}>
        <div className={cn(styles.contestFormHeader)}>
          <h3>{contestLabel}</h3>
          <TabGroup
            activeTab={activeTab}
            className={styles.borderBottom}
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
          <>
            <h4>General Information</h4>
            <FormikRadioGroup
              className={styles.formBox}
              direction="row"
              id={`${contestKey}.gender`}
              label="Gender"
              options={eventGenderOptions}
              placeholder="Select gender"
              required
            />
            <FormikRadioGroup
              className={styles.formBox}
              direction="row"
              id={`${contestKey}.discipline`}
              label="Discipline"
              placeholder="Select discipline"
              options={disciplineOptions}
              required
            />
            <FormikSelectField
              id={`${contestKey}.judgingSystem`}
              label="Judging System"
              options={judgingSystemOptions}
              placeholder="Select judging system"
              required
            />
            <FormikRadioGroup
              className={styles.formBox}
              direction="row"
              id={`${contestKey}.ageCategory`}
              label="Age Category"
              options={ageCategoryOptions}
              placeholder="Select age category"
              required
            />
            <FormikNumberField
              id={`${contestKey}.totalPrizeValue`}
              label="Total Prize Value"
              placeholder="0"
              min="0"
            />
            <FormikRadioGroup
              className={styles.formBox}
              direction="row"
              id={`${contestKey}.contestSize`}
              label="Contest Size"
              options={contestSizeOptions}
              placeholder="Select contest size"
              required
            />
          </>
        )}
        {activeTab === 'JUDGES' && (
          <>
            <h4>Judges</h4>
            <FieldArray name={`${contestKey}.judges`}>
              {({ push, remove }) => (
                <ul className={cn("stack", "gap-4")}>
                  {judges?.length > 0 && judges.map((_, idx) => (
                    <li key={idx}>
                      <div className={cn("cluster", "items-end", "gap-4")}>
                        <UserAutocomplete id={`${contestKey}.judges[${idx}]`} />
                        <Button
                          // onClick={() => remove(idx)}
                          onClick={() => {
                            remove(idx);
                            // trigger validation + mark touched for the judges array
                            setFieldTouched(`${contestKey}.judges`, true, true);
                          }}
                          variant='destructive-secondary'
                          type="button"
                          >
                          <TrashIcon/>
                        </Button>
                      </div>
                    </li>
                  ))}
                  <Button
                    onClick={() => {
                      push("");
                      setFieldTouched(`${contestKey}.judges`, true, true);
                    }}
                    variant="secondary"
                    type="button"
                  >
                    Add Judge
                  </Button>
                </ul>
              )}
            </FieldArray>
          </>
        )}
      </section>
      <div className={cn('cluster', 'items-center', 'gap-4', 'justify-end')}>
        <Button
          type="button"
          variant="destructive-secondary"
          onClick={() => onRemove?.(contestIdx)}
        >
          Delete Contest
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {}}
        >
          Duplicate Contest
        </Button>
      </div>
    </>
  );
}
