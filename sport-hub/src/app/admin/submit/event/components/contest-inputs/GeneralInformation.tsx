'use client';

import {
  FormikSelectField,
  disciplineOptions,
  ageCategoryOptions,
  judgingSystemOptions,
  contestSizeOptions,
  eventGenderOptions,
  FormikRadioGroup,
  FormikNumberField,
} from '@ui/Form';
import styles from './styles.module.css';

type Props = {
  contestKey: string;
}

export const GeneralInformation = ({ contestKey }: Props) => {
  return (
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
        caption="Scoring System used for this competition"
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
        caption="Sum in Euro of all cash and gear prizes (retail value) given per competition. Without Food and Accomodation."
        id={`${contestKey}.totalPrizeValue`}
        label="Total Prize Value (€)"
        placeholder="0"
        min="0"
      />
      <FormikRadioGroup
        className={styles.formBox}
        caption="Contest Size proposed by organiser in coordination with ISA sportcom, might be revised after competition."
        direction="row"
        id={`${contestKey}.contestSize`}
        label="Contest Size"
        options={contestSizeOptions}
        placeholder="Select contest size"
        required
      />
    </>
  );
};