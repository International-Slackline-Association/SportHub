'use client';

import { useState } from 'react';
import { Form, Formik, type FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { FormikNumberField, FormikSelectField, FormikSubmitButton, FormikTextAreaField, FormikTextField } from '@ui/Form';
import type { FirstCategoryStatus, FirstCategoryTableItem } from '@lib/relational-types';
import { createFirstCategory, updateFirstCategory } from '../actions';
import { categoryHref, FIRST_STATUS_OPTIONS } from './statusOptions';

interface FirstCategoryFormValues {
  name: string;
  terminationRule: string;
  status: FirstCategoryStatus;
  order: number;
  comment: string;
}

const validationSchema = Yup.object({
  name: Yup.string().trim().required('A name is required'),
  order: Yup.number().integer().min(0),
});

type Props = {
  /** Discipline to edit; without it the form creates a new one. */
  category?: FirstCategoryTableItem;
};

const LIST_HREF = '/admin/records-categories';

/** Create or edit a world first discipline. Changes, with the optional reason, are logged in the history. */
export default function FirstCategoryForm({ category }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const initialValues: FirstCategoryFormValues = {
    name: category?.name ?? '',
    terminationRule: category?.terminationRule ?? '',
    status: category?.status ?? 'active',
    order: category?.order ?? 0,
    comment: '',
  };

  const submit = async (values: FirstCategoryFormValues, { resetForm }: FormikHelpers<FirstCategoryFormValues>) => {
    setSaved(false);
    if (category) {
      const result = await updateFirstCategory(category.categoryId, values);
      setError(result.success ? null : result.error ?? 'Failed');
      if (result.success) { setSaved(true); resetForm({ values: { ...values, comment: '' } }); router.refresh(); }
      return;
    }
    const { name, terminationRule, status } = values;
    const result = await createFirstCategory({ name, terminationRule, status });
    setError(result.success ? null : result.error ?? 'Failed');
    if (result.success && result.categoryId) router.push(categoryHref('first', result.categoryId));
  };

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={submit}>
      <Form className="stack gap-3 text-sm">
        <FormikTextField id="first-name" name="name" label="Name" placeholder="e.g. Waterline" required />
        <FormikTextAreaField id="first-termination-rule" name="terminationRule" label="Termination rule" placeholder="When the trick counts as landed" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <FormikSelectField id="first-status" name="status" label="Status" options={FIRST_STATUS_OPTIONS} required />
          {category && <FormikNumberField id="first-order" name="order" label="Order" />}
        </div>
        {category && <FormikTextField id="first-comment" name="comment" label="Reason for the change" placeholder="Optional, shown in the history" />}
        {error && <Alert>{error}</Alert>}
        {saved && <Alert variant="success">Saved.</Alert>}
        <div className="flex gap-2">
          <FormikSubmitButton>{category ? 'Save changes' : 'Create'}</FormikSubmitButton>
          {!category && <Button as="link" href={LIST_HREF} variant="secondary">Cancel</Button>}
        </div>
      </Form>
    </Formik>
  );
}
