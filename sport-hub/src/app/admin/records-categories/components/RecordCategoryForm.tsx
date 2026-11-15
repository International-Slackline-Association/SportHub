'use client';

import { useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { FormikNumberField, FormikSelectField, FormikSubmitButton, FormikTextAreaField, FormikTextField } from '@ui/Form';
import { UNIT_SUGGESTIONS, unitKind } from '@lib/records-logic';
import { RECORD_CATEGORY_GROUPS } from '@lib/relational-types';
import type { RecordCategoryGroup, RecordCategoryStatus, RecordCategoryTableItem } from '@lib/relational-types';
import { createRecordCategory, updateRecordCategory } from '../actions';
import { categoryHref, RECORD_STATUS_OPTIONS } from './statusOptions';

const UNIT_LIST_ID = 'record-unit-suggestions';

const GROUP_OPTIONS: Option[] = RECORD_CATEGORY_GROUPS.map(g => ({ value: g, label: g }));
const DIRECTION_OPTIONS: Option[] = [
  { value: 'higher', label: 'Higher is better' },
  { value: 'lower', label: 'Lower is better' },
];

const unitNote = (unit: string) => {
  switch (unitKind(unit)) {
    case 'm': return 'metres';
    case 's': return 'time, stored in seconds';
    case 'count': return 'count';
    case 'coordinates': return 'coordinates, compared by absolute latitude';
    default: return 'plain number';
  }
};

interface RecordCategoryFormValues {
  name: string;
  description: string;
  group: RecordCategoryGroup;
  unit: string;
  direction: 'higher' | 'lower';
  status: RecordCategoryStatus;
  order: number;
  comment: string;
}

const validationSchema = Yup.object({
  name: Yup.string().trim().required('A name is required'),
  unit: Yup.string().trim().required('A unit is required'),
  group: Yup.string().oneOf([...RECORD_CATEGORY_GROUPS]).required(),
  direction: Yup.string().oneOf(['higher', 'lower']).required(),
  order: Yup.number().integer().min(0),
});

type Props = {
  /** Category to edit; without it the form creates a new one. */
  category?: RecordCategoryTableItem;
};

const LIST_HREF = '/admin/records-categories';

/** Create or edit a world record category. Changes, with the optional reason, are logged in the history. */
export default function RecordCategoryForm({ category }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const initialValues: RecordCategoryFormValues = {
    name: category?.name ?? '',
    description: category?.description ?? '',
    group: category?.group ?? 'Length',
    unit: category?.unit ?? 'm',
    direction: category?.direction ?? 'higher',
    status: category?.status ?? 'unchallenged',
    order: category?.order ?? 0,
    comment: '',
  };

  const submit = async (values: RecordCategoryFormValues, { resetForm }: FormikHelpers<RecordCategoryFormValues>) => {
    setSaved(false);
    if (category) {
      const result = await updateRecordCategory(category.categoryId, values);
      setError(result.success ? null : result.error ?? 'Failed');
      if (result.success) { setSaved(true); resetForm({ values: { ...values, comment: '' } }); router.refresh(); }
      return;
    }
    const { status, ...fields } = values;
    const result = await createRecordCategory({ ...fields, status });
    setError(result.success ? null : result.error ?? 'Failed');
    if (result.success && result.categoryId) router.push(categoryHref('record', result.categoryId));
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={submit}>
      {({ values }) => (
        <Form className="stack gap-3 text-sm">
          <FormikTextField id="name" name="name" label="Name" required />
          <FormikTextAreaField id="description" name="description" label="Description" rows={2} placeholder="What is measured and how" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <FormikSelectField id="group" name="group" label="Group" options={GROUP_OPTIONS} required />
            <FormikTextField id="unit" name="unit" label="Unit" list={UNIT_LIST_ID} placeholder="m, s, count, °, kg…" caption={unitNote(values.unit)} required />
            <FormikSelectField id="direction" name="direction" label="Better is" options={DIRECTION_OPTIONS} required />
          </div>
          <datalist id={UNIT_LIST_ID}>
            {UNIT_SUGGESTIONS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </datalist>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <FormikSelectField id="status" name="status" label="Status" options={RECORD_STATUS_OPTIONS} required />
            {category && <FormikNumberField id="order" name="order" label="Order" />}
          </div>
          {category && <FormikTextField id="comment" name="comment" label="Reason for the change" placeholder="Optional, shown in the history" />}
          {category && unitKind(values.unit) !== unitKind(category.unit) && (
            <span className="text-xs text-amber-700">Changing the unit type re-reads the values of all entries in this category.</span>
          )}
          {error && <Alert>{error}</Alert>}
          {saved && <Alert variant="success">Saved.</Alert>}
          <div className="flex gap-2">
            <FormikSubmitButton>{category ? 'Save changes' : 'Create'}</FormikSubmitButton>
            {!category && <Button as="link" href={LIST_HREF} variant="secondary">Cancel</Button>}
          </div>
        </Form>
      )}
    </Formik>
  );
}
