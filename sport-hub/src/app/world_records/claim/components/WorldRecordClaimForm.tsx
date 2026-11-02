'use client';

/**
 * Formik form of a world record claim with its validation schema. What happens
 * on submit, and the action buttons, come from the page that uses it.
 */

import { useEffect, useMemo, type ReactNode } from 'react';
import { Form, Formik, useFormikContext, type FormikHelpers, type FormikProps } from 'formik';
import { worldRecordClaimSchema } from '../schemas';
import type { ClaimFormValues } from '../types';
import WorldRecordClaimFields, { type WorldRecordClaimFieldsProps } from './WorldRecordClaimFields';
import { ValidationSummary, ValuesObserver } from './ClaimSections';

type Props = WorldRecordClaimFieldsProps & {
  initialValues: ClaimFormValues;
  onSubmit: (values: ClaimFormValues, helpers: FormikHelpers<ClaimFormValues>) => Promise<void>;
  /** Existing category or new category, when chosen outside the form. */
  path?: 'existing' | 'new_category';
  renderActions: (form: FormikProps<ClaimFormValues>) => ReactNode;
  onValuesChange?: (values: ClaimFormValues) => void;
};

/** Follows a path chosen outside the form; a new category starts without a chosen category. */
function PathSync({ path }: { path?: 'existing' | 'new_category' }) {
  const { values, setFieldValue } = useFormikContext<ClaimFormValues>();
  useEffect(() => {
    if (!path || path === values.path) return;
    setFieldValue('path', path);
    if (path === 'new_category') setFieldValue('categoryId', '');
  }, [path, values.path, setFieldValue]);
  return null;
}

export default function WorldRecordClaimForm({ initialValues, onSubmit, path, renderActions, onValuesChange, ...fieldProps }: Props) {
  const { claimantId, admin } = fieldProps;
  const validationSchema = useMemo(() => worldRecordClaimSchema({ claimantId, admin }), [claimantId, admin]);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
    >
      {form => (
        <Form className="stack gap-8">
          <PathSync path={path} />
          <ValuesObserver onChange={onValuesChange} />
          <WorldRecordClaimFields {...fieldProps} />
          <ValidationSummary />
          {renderActions(form)}
        </Form>
      )}
    </Formik>
  );
}
