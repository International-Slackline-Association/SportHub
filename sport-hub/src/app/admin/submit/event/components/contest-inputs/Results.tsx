'use client';

import { FieldArray, getIn, useFormikContext } from 'formik';
import { cn } from '@utils/cn';
import Button from '@ui/Button';
import { TrashIcon } from '@ui/Icons';
import UserAutocomplete from './UserAutocomplete';
import { EventSubmissionFormValues } from '../../types';
import { FormikNumberField, FormikTextField } from '@ui/Form';
import SortableList from '@ui/SortableList';
import { Option } from '@ui/Form';

const initialAthleteValues = {
  athleteId: "",
  athleteName: "",
  isaPoints: 0,
  stats: ""
};

type Props = {
  contestKey: string;
  results: any[];
}

type AthleteListItemProps = {
  athleteFormKey: string,
  onDelete: () => void
};

const AthleteListItem = ({ athleteFormKey, onDelete }: AthleteListItemProps) => {
  const { setFieldTouched, setFieldValue, values } = useFormikContext<EventSubmissionFormValues>();

  return (
    <div className={cn("cluster", "items-end", "gap-4")}>
      <FormikNumberField id={`${athleteFormKey}.rank`} label="Rank" min={1} />
      <UserAutocomplete
        id={`${athleteFormKey}.name`}
        onSelectOption={(option: Option) => {
          const athlete = getIn(values, athleteFormKey) || {};
          setFieldValue(athleteFormKey, {
            ...athlete,
            id: option.value,
            name: option.label
          });
          setFieldTouched(athleteFormKey, true, false);
        }}
      />
      <FormikNumberField id={`${athleteFormKey}.isaPoints`} label="ISA Points" min={0} />
      <FormikTextField id={`${athleteFormKey}.stats`} label="Stats" />
      <Button
        className="self-end"
        onClick={onDelete}
        variant='destructive-secondary'
        type="button"
      >
        <TrashIcon/>
      </Button>
    </div>
  );
};

export const Results = ({ contestKey, results }: Props) => {
  const { setFieldTouched, setFieldValue } = useFormikContext<EventSubmissionFormValues>();

  return (
    <>
      <h4>Results</h4>
      <FieldArray name={`${contestKey}.results`}>
        {({ push, remove }) => (
          <div className={cn("stack", "gap-4")}>
            {!results.length && (
              <div>No results added yet.</div>
            )}
            <SortableList
              items={results.map((r, idx) => ({ ...r, __key: r?.athleteId || `row-${idx}` }))}
              getKey={(r: any) => r.__key as string}
              renderItem={(_, idx: number) =>
                <AthleteListItem
                  athleteFormKey={`${contestKey}.results[${idx}]`}
                  onDelete={() => {
                    remove(idx);
                    setFieldTouched(`${contestKey}.results`, true, false);
                  }}
                />
              }
              onReorder={(next: any[]) => {
                const cleaned = next.map(({ __key, ...rest }, i) => ({ ...rest, rank: i + 1 }));
                setFieldValue(`${contestKey}.results`, cleaned, true);
                setFieldTouched(`${contestKey}.results`, true, false);
              }}
            />
            <Button
              className="w-fit"
              onClick={() => {
                push({
                  ...initialAthleteValues,
                  rank: results.length + 1
                });
                setFieldTouched(`${contestKey}.results`, true, false);
              }}
              type="button"
              variant="secondary"
            >
              Add Athlete
            </Button>
          </div>
        )}
      </FieldArray>
    </>
  )
};
