'use client';

/**
 * Formik form of a world first claim with its validation schema. What happens
 * on submit, and the action buttons, come from the page that uses it.
 */

import { useMemo, type ReactNode } from 'react';
import { Form, Formik, type FormikHelpers, type FormikProps } from 'formik';
import { worldFirstClaimSchema } from '../schemas';
import type { ClaimFormValues } from '../types';
import WorldFirstClaimFields, { type WorldFirstClaimFieldsProps } from './WorldFirstClaimFields';
import { ValidationSummary, ValuesObserver } from './ClaimSections';

type Props = WorldFirstClaimFieldsProps & {
  initialValues: ClaimFormValues;
  onSubmit: (values: ClaimFormValues, helpers: FormikHelpers<ClaimFormValues>) => Promise<void>;
  renderActions: (form: FormikProps<ClaimFormValues>) => ReactNode;
  onValuesChange?: (values: ClaimFormValues) => void;
};

export default function WorldFirstClaimForm({ initialValues, onSubmit, renderActions, onValuesChange, ...fieldProps }: Props) {
  const { claimantId, admin } = fieldProps;
  const validationSchema = useMemo(() => worldFirstClaimSchema({ claimantId, admin }), [claimantId, admin]);

  return (
    <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit}>
      {form => (
        <Form className="stack gap-8">
          <ValuesObserver onChange={onValuesChange} />
          <WorldFirstClaimFields {...fieldProps} />
          <ValidationSummary />
          {renderActions(form)}
        </Form>
      )}
    </Formik>
  );
}
