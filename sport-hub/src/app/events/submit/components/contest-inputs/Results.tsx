'use client';

import { FieldArray, getIn, useFormikContext } from 'formik';
import { cn } from '@utils/cn';
import Button from '@ui/Button';
import { TrashIcon } from '@ui/Icons';
import UserAutocomplete from './UserAutocomplete';
import { ContestResultEntry, EventSubmissionFormValues } from '../../types';
import { FormikNumberField, FormikTextField } from '@ui/Form';
import PendingUserForm from './PendingUserForm';
import { calculatePointsForRank } from '@utils/points';

const initialAthleteValues: Partial<ContestResultEntry> = {
  id: "",
  name: "",
  isaPoints: 0,
  stats: "",
};

type Props = {
  contestKey: string;
  results: ContestResultEntry[];
}

type AthleteListItemProps = {
  athleteFormKey: string,
  contestKey: string,
  isNewUser?: boolean,
  onDelete: () => void,
};

const AthleteListItem = ({
  athleteFormKey,
  contestKey,
  onDelete
}: AthleteListItemProps) => {
  const { values, setFieldValue } = useFormikContext<EventSubmissionFormValues>();
  const formValueUserId = getIn(values, `${athleteFormKey}.id`);

  return (
    <div className="flex flex-row cluster items-end gap-4 mb-4">
      <FormikNumberField
        className="shrink"
        id={`${athleteFormKey}.rank`}
        label="Rank"
        min={1}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const rank = Number(e.target.value);
          const contestSize = getIn(values, `${contestKey}.contestSize`);
          const points = calculatePointsForRank(rank, contestSize);
          setFieldValue(`${athleteFormKey}.isaPoints`, points);
          setFieldValue(`${athleteFormKey}.rank`, rank);
        }}
      />
      <UserAutocomplete formKey={athleteFormKey} readOnlyIfSet={!!formValueUserId} />
      <FormikNumberField
        className="shrink"
        disabled
        id={`${athleteFormKey}.isaPoints`}
        label="Points"
        min={0}
      />
      <FormikTextField
        className="shrink"
        id={`${athleteFormKey}.stats`}
        label="Stats"
        tooltip="Data relevant to placement. Varies by discipline e.g. line length, time, etc."
      />
      <PendingUserForm formKey={athleteFormKey} />
      <Button
        className="self-end"
        onClick={onDelete}
        type="button"
        variant='destructive-secondary'
      >
        <TrashIcon/>
      </Button>
    </div>
  );
};

export const Results = ({ contestKey, results }: Props) => {
  const { setFieldTouched, setFieldValue, values } = useFormikContext<EventSubmissionFormValues>();
  const contestSize = getIn(values, `${contestKey}.contestSize`);

  return (
    <>
      <h4>Results</h4>
      <FieldArray name={`${contestKey}.results`}>
        {({ push, remove }) => (
          <div className={cn("stack", "gap-4")}>
            {!results.length && (
              <div>No results added yet.</div>
            )}
            <ol>
              {results.map((entry, idx) => (
                <AthleteListItem
                  athleteFormKey={`${contestKey}.results[${idx}]`}
                  contestKey={contestKey}
                  key={`${entry.id}-${idx}`}
                  onDelete={() => {
                    // Recalculate index because item may have been re-ordered
                    const currentIdx = results.findIndex((r) => r.id === entry.id);
                    remove(currentIdx);
                    setFieldTouched(`${contestKey}.results`, true, false);
                  }}
                />
              ))}
            </ol>
            <div className="flex flex-row justify-start gap-4">
              <Button
                type="button"
                onClick={() => {
                  let rank;
                  let points;
                  const ranksSet = new Set(results.map(r => r.rank));
                  const hasNoSharedRanks = ranksSet.size === results.length;
                  if (hasNoSharedRanks) {
                    // If no shared ranks, assign next rank
                    rank = results.length + 1;
                  } else {
                    // If there are shared ranks, leave rank undefined for manual entry
                    rank = undefined;
                  }

                  if (rank && contestSize) {
                    points = calculatePointsForRank(rank, contestSize);
                  }

                  push({ ...initialAthleteValues, rank, isaPoints: points });
                  setFieldTouched(`${contestKey}.results`, true, false);
                }}
                variant="secondary"
              >
                Add Athlete
              </Button>
              {results.length > 1 && (
                <>
                  <Button
                    type="button"
                    onClick={() => {
                      const sortedResults = [...results].sort((a, b) => (a.rank || 0) - (b.rank || 0));
                      setFieldValue(`${contestKey}.results`,  sortedResults, true);
                      setFieldTouched(`${contestKey}.results`, true, false);
                    }}
                    variant="secondary"
                    >
                    Sort by rank
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </FieldArray>
    </>
  )
};
