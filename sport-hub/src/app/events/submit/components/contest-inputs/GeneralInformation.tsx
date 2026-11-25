'use client';

import { getIn, useFormikContext } from 'formik';
import {
  FormikSelectField,
  disciplineOptions,
  ageCategoryOptions,
  judgingSystemOptions,
  contestSizeOptions,
  eventGenderOptions,
  FormikRadioGroup,
  FormikNumberField,
  FormikTextField,
} from '@ui/Form';
import type { EventSubmissionFormValues } from '../../types';

type Props = {
  contestKey: string;
}

export const GeneralInformation = ({ contestKey }: Props) => {
  const { values } = useFormikContext<EventSubmissionFormValues>();
  const startDate = getIn(values, `${contestKey}.startDate`) as string | undefined;
  const endDate = getIn(values, `${contestKey}.endDate`) as string | undefined;

  return (
    <>
      <h4>General Information</h4>
      <div className="flex flex-row gap-4">
        <FormikTextField
          className="grow"
          id={`${contestKey}.startDate`}
          label="Start Date"
          name={`${contestKey}.startDate`}
          placeholder="YYYY-MM-DD"
          type="date"
          max={endDate || undefined}
          />
        <FormikTextField
          className="grow"
          id={`${contestKey}.endDate`}
          label="End Date"
          name={`${contestKey}.endDate`}
          placeholder="YYYY-MM-DD"
          tooltip="Date of the final round"
          type="date"
          min={startDate || undefined}
          />
      </div>
      <FormikRadioGroup
        direction="row"
        id={`${contestKey}.gender`}
        label="Gender"
        name={`${contestKey}.gender`}
        options={eventGenderOptions}
        placeholder="Select gender"
        required
      />
      <FormikRadioGroup
        direction="row"
        id={`${contestKey}.discipline`}
        label="Discipline"
        name={`${contestKey}.discipline`}
        placeholder="Select discipline"
        options={disciplineOptions}
        required
      />
      <FormikSelectField
        caption="Scoring System used for this competition"
        id={`${contestKey}.judgingSystem`}
        label="Judging System"
        name={`${contestKey}.judgingSystem`}
        options={judgingSystemOptions}
        placeholder="Select judging system"
      />
      <FormikRadioGroup
        direction="row"
        id={`${contestKey}.ageCategory`}
        label="Age Category"
        name={`${contestKey}.ageCategory`}
        options={ageCategoryOptions}
        placeholder="Select age category"
        required
      />
      <FormikNumberField
        caption="Sum in Euro of all cash and gear prizes (retail value) given per competition. Without Food and Accomodation."
        id={`${contestKey}.totalPrizeValue`}
        label="Total Prize Value (€)"
        name={`${contestKey}.totalPrizeValue`}
        placeholder="0"
        min="0"
      />
      <FormikRadioGroup
        caption="Contest Size proposed by organiser in coordination with ISA sportcom, might be revised after competition."
        direction="row"
        id={`${contestKey}.contestSize`}
        label="Contest Size"
        name={`${contestKey}.contestSize`}
        options={contestSizeOptions}
        placeholder="Select contest size"
        required
      />
    </>
  );
};