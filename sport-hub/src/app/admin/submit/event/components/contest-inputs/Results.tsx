'use client';

import { FieldArray, getIn, useFormikContext } from 'formik';
import { cn } from '@utils/cn';
import Button from '@ui/Button';
import { TrashIcon } from '@ui/Icons';
import UserAutocomplete from './UserAutocomplete';
import { ContestResultEntry, EventSubmissionFormValues } from '../../types';
import { FormikNumberField, FormikTextField } from '@ui/Form';
import UserManagementModal from '@ui/UserForm/UserManagementModal';

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
  isNewUser?: boolean,
  onDelete: () => void
};

const AthleteListItem = ({
  athleteFormKey,
  onDelete
}: AthleteListItemProps) => {
  const { values } = useFormikContext<EventSubmissionFormValues>();
  const formValueUserId = getIn(values, `${athleteFormKey}.id`);
  const formValueName = getIn(values, `${athleteFormKey}.name`);
  const isUnknownUser = formValueUserId == "" && formValueName != "";

  return (
    <div className="flex flex-row cluster items-end gap-4 mb-4">
      <FormikNumberField
        className="shrink"
        id={`${athleteFormKey}.rank`}
        label="Rank"
        min={1}
      />
      <UserAutocomplete formKey={athleteFormKey} />
      <FormikNumberField className="shrink" id={`${athleteFormKey}.isaPoints`} label="ISA Points" min={0} />
      <FormikTextField className="shrink" id={`${athleteFormKey}.stats`} label="Stats" tooltip="Data relevant to placement, varies by discipline e.g. length, time, etc." />
      {isUnknownUser && (
        // TODO FORM CANNOT BE NESTED IN FORM.
        <UserManagementModal action="CREATE" buttonVariant="secondary" />
        // TODO make text small
        // <span className="text-[12px]">Register</span>
      )}
      <Button
        className="self-end"
        onClick={onDelete}
        variant='destructive-secondary'
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
            <ol>
              {results.map((entry, idx) => (
                <AthleteListItem
                  athleteFormKey={`${contestKey}.results[${idx}]`}
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
                onClick={() => {
                  let rank;
                  const ranksSet = new Set(results.map(r => r.rank));
                  const hasNoSharedRanks = ranksSet.size === results.length;
                  if (hasNoSharedRanks) {
                    // If no shared ranks, assign next rank
                    rank = results.length + 1;
                  } else {
                    // If there are shared ranks, leave rank undefined for manual entry
                    rank = undefined;
                  }

                  push({ ...initialAthleteValues, rank });
                  setFieldTouched(`${contestKey}.results`, true, false);
                }}
                variant="secondary"
              >
                Add Athlete
              </Button>
              {results.length > 1 && (
                <Button
                  onClick={() => {
                    const sortedResults = [...results].sort((a, b) => (a.rank || 0) - (b.rank || 0));
                    setFieldValue(`${contestKey}.results`,  sortedResults, true);
                    setFieldTouched(`${contestKey}.results`, true, false);
                  }}
                  variant="secondary"
                >
                  Sort by rank
                </Button>
              )}
            </div>
          </div>
        )}
      </FieldArray>
    </>
  )
};
