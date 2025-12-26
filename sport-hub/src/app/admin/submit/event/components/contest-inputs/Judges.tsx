'use client';

import { FieldArray, useFormikContext } from 'formik';
import { cn } from '@utils/cn';
import Button from '@ui/Button';
import { TrashIcon } from '@ui/Icons';
import UserAutocomplete from './UserAutocomplete';
import { EventSubmissionFormValues } from '../../types';

type Props = {
  contestKey: string;
  judges: string[];
}

export const Judges = ({ contestKey, judges }: Props) => {
  const { setFieldTouched, setFieldValue } = useFormikContext<EventSubmissionFormValues>();

  return (
    <div className={cn("stack", "gap-4")}>
      <h4>Judges</h4>
      <FieldArray name={`${contestKey}.judges`} validateOnChange={false}>
        {({ push, remove }) => (
          <>
            <ul>
              {!judges.length && (
                <div>No judges added yet.</div>
              )}
              {judges.map((_, idx) => (
                <li key={idx} className="pb-4">
                  <div className={cn("cluster", "items-end", "gap-4")}>
                    <UserAutocomplete
                      id={`${contestKey}.judges[${idx}]`}
                      onSelectOption={({ label, value }) => {
                        setFieldValue(`${contestKey}.judges[${idx}]`, {
                          value: value,
                          name: label,
                        });
                      }}
                    />
                    <Button
                      onClick={() => remove(idx)}
                      variant='destructive-secondary'
                      type="button"
                      >
                      <TrashIcon/>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <Button
              className="w-fit"
              onClick={() => {
                push({ id: "", name: "" });
                setFieldTouched(`${contestKey}.judges`, true, false);
              }}
              variant="secondary"
              type="button"
            >
              Add Judge
            </Button>
          </>
        )}
      </FieldArray>
    </div>
  )
};
