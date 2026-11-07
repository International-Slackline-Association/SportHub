'use client';

import { Form, Formik } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { FormikNumberField, FormikSelectField, FormikSubmitButton, FormikTextAreaField, FormikTextField } from '@ui/Form';
import type { FirstCategoryStatus, FirstCategoryTableItem } from '@lib/relational-types';
import { createFirstCategory, updateFirstCategory } from '../actions';
import { FIRST_STATUS_OPTIONS } from './statusOptions';

interface FirstCategoryFormValues {
  name: string;
  terminationRule: string;
  status: FirstCategoryStatus;
  order: number;
}

const validationSchema = Yup.object({
  name: Yup.string().trim().required('A name is required'),
  order: Yup.number().integer().min(0),
});

type Props = {
  /** Discipline to edit; without it the form creates a new one. */
  category?: FirstCategoryTableItem;
  onDone: () => void;
  onError: (error: string | null) => void;
};

/** Create or edit a world first discipline. The status of an existing discipline is set in the table. */
export default function FirstCategoryForm({ category, onDone, onError }: Props) {
  const router = useRouter();
  const initialValues: FirstCategoryFormValues = {
    name: category?.name ?? '',
    terminationRule: category?.terminationRule ?? '',
    status: category?.status ?? 'active',
    order: category?.order ?? 0,
  };

  const submit = async ({ status, order, ...fields }: FirstCategoryFormValues) => {
    const result = category
      ? await updateFirstCategory(category.categoryId, { ...fields, order })
      : await createFirstCategory({ ...fields, status });
    onError(result.success ? null : result.error ?? 'Failed');
    if (result.success) { onDone(); router.refresh(); }
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={submit}>
      <Form className="border border-gray-200 rounded-lg p-4 stack gap-2 text-sm">
        <h3 className="font-semibold">{category ? `Edit "${category.name}"` : 'New first discipline'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FormikTextField id="first-name" name="name" label="Name" placeholder="e.g. Waterline" required />
          {category
            ? <FormikNumberField id="first-order" name="order" label="Order" />
            : <FormikSelectField id="first-status" name="status" label="Status" options={FIRST_STATUS_OPTIONS} required />}
        </div>
        <FormikTextAreaField id="first-termination-rule" name="terminationRule" label="Termination rule" placeholder="When the trick counts as landed" />
        <div className="flex gap-2">
          <FormikSubmitButton>{category ? 'Save' : 'Create'}</FormikSubmitButton>
          <Button type="button" variant="secondary" onClick={onDone}>Cancel</Button>
        </div>
      </Form>
    </Formik>
  );
}
