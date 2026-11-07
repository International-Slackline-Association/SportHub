'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { FormikNumberField, FormikSelectField, FormikSubmitButton, FormikTextAreaField, FormikTextField } from '@ui/Form';
import { UNIT_SUGGESTIONS, unitKind } from '@lib/records-logic';
import { RECORD_CATEGORY_GROUPS } from '@lib/relational-types';
import type { RecordCategoryGroup, RecordCategoryStatus, RecordCategoryTableItem } from '@lib/relational-types';
import { createRecordCategory, updateRecordCategory } from '../actions';
import { RECORD_STATUS_OPTIONS } from './statusOptions';

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
  onDone: () => void;
  onError: (error: string | null) => void;
};

/** Create or edit a world record category. The status of an existing category is set in the table. */
export default function RecordCategoryForm({ category, onDone, onError }: Props) {
  const router = useRouter();
  const initialValues: RecordCategoryFormValues = {
    name: category?.name ?? '',
    description: category?.description ?? '',
    group: category?.group ?? 'Length',
    unit: category?.unit ?? 'm',
    direction: category?.direction ?? 'higher',
    status: category?.status ?? 'unchallenged',
    order: category?.order ?? 0,
  };

  const submit = async (values: RecordCategoryFormValues) => {
    const { status, order, ...fields } = values;
    const result = category
      ? await updateRecordCategory(category.categoryId, { ...fields, order })
      : await createRecordCategory({ ...fields, status });
    onError(result.success ? null : result.error ?? 'Failed');
    if (result.success) { onDone(); router.refresh(); }
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={submit}>
      {({ values }) => (
        <Form className="border border-gray-200 rounded-lg p-4 stack gap-2 text-sm">
          <h3 className="font-semibold">{category ? `Edit "${category.name}"` : 'New record category'}</h3>
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
          {category ? (
            <div className="sm:w-1/3">
              <FormikNumberField id="order" name="order" label="Order" />
            </div>
          ) : (
            <div className="sm:w-1/3">
              <FormikSelectField id="status" name="status" label="Status" options={RECORD_STATUS_OPTIONS} required />
            </div>
          )}
          {category && unitKind(values.unit) !== unitKind(category.unit) && (
            <span className="text-xs text-amber-700">Changing the unit type re-reads the values of all entries in this category.</span>
          )}
          <div className="flex gap-2">
            <FormikSubmitButton>{category ? 'Save' : 'Create'}</FormikSubmitButton>
            <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
