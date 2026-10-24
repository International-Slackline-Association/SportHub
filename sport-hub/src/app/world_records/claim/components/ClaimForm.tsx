'use client';

/**
 * The claimant's claim form: save a draft, submit for review, delete a draft
 * (requirements §7.2). The fields themselves are in ClaimFields.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import Spinner from '@ui/Spinner';
import type { ClaimStatus, FirstCategoryRecord, RecordCategoryRecord } from '@lib/relational-types';
import { deleteDraft, saveClaim } from '../../actions';
import type { ClaimFormValues } from '../types';
import ClaimFields, { PathResetter } from './ClaimFields';

type Props = {
  recordCategories: RecordCategoryRecord[];
  firstCategories: FirstCategoryRecord[];
  initialValues: ClaimFormValues;
  claimantId: string;
  reviewComment?: string;
  /** Status of a saved claim; undefined for a new one. */
  status?: ClaimStatus;
};

export default function ClaimForm({ recordCategories, firstCategories, initialValues, claimantId, reviewComment, status }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [intent, setIntent] = useState<'draft' | 'submit'>('submit');

  const removeDraft = async (kind: 'record' | 'first', entryId: string) => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    setDeleting(true);
    const result = await deleteDraft(kind, entryId);
    setDeleting(false);
    if (!result.success) { setErrors(result.errors); return; }
    router.push('/world_records/my-claims');
  };

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={async (values, { setSubmitting, setFieldValue }) => {
        setErrors([]);
        setMessage(null);
        const result = await saveClaim(values, intent);
        setSubmitting(false);
        if (!result.success) {
          setErrors(result.errors);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        if (intent === 'submit') {
          router.push(`/world_records/my-claims?submitted=${result.kind}:${result.entryId}`);
          return;
        }
        setFieldValue('entryId', result.entryId);
        setMessage(result.message ?? 'Saved');
        router.replace(`/world_records/claim?kind=${result.kind}&id=${result.entryId}`, { scroll: false });
      }}
    >
      {({ isSubmitting, values, setFieldValue, dirty }) => (
        <Form className="stack gap-8">
          {reviewComment && (
            <section className="p-4 sm:p-0">
              <Alert variant="warning">The ISA asked for changes: {reviewComment}</Alert>
            </section>
          )}
          {errors.length > 0 && (
            <section className="p-4 sm:p-0">
              <Alert variant="error">
                <div className="stack gap-1">
                  <span>The claim could not be {intent === 'submit' ? 'submitted' : 'saved'}:</span>
                  <ul className="list-disc pl-5">{errors.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              </Alert>
            </section>
          )}
          {message && <section className="p-4 sm:p-0"><Alert variant="success">{message}</Alert></section>}

          <PathResetter onChange={() => setFieldValue('categoryId', '')} path={values.path} />
          <ClaimFields recordCategories={recordCategories} firstCategories={firstCategories} claimantId={claimantId} />

          <section className="p-4 sm:p-0 flex gap-3 flex-wrap">
            <Button type="submit" variant="secondary" disabled={isSubmitting} onClick={() => setIntent('draft')}>
              {isSubmitting && intent === 'draft' ? <Spinner size="small" /> : 'Save draft'}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} onClick={() => setIntent('submit')}>
              {isSubmitting && intent === 'submit' ? <Spinner size="small" color="white" /> : 'Submit for review'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                if (dirty && !confirm('Leave without saving? Your unsaved changes are lost.')) return;
                router.push('/world_records/my-claims');
              }}
            >
              Return to My Claims
            </Button>
            {values.entryId && (status ?? 'draft') === 'draft' && (
              <Button
                type="button"
                variant="destructive-secondary"
                disabled={isSubmitting || deleting}
                onClick={() => removeDraft(values.path === 'first' ? 'first' : 'record', values.entryId!)}
              >
                {deleting ? <Spinner size="small" /> : 'Delete draft'}
              </Button>
            )}
          </section>
        </Form>
      )}
    </Formik>
  );
}
