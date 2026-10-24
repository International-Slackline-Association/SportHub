'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Formik } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import Spinner from '@ui/Spinner';
import type { FirstCategoryRecord, RecordCategoryRecord } from '@lib/relational-types';
import { adminUpdateEntry } from 'src/app/admin/records-review/actions';
import ClaimFields, { PathResetter } from 'src/app/world_records/claim/components/ClaimFields';
import type { ClaimFormValues } from 'src/app/world_records/claim/types';

type Props = {
  kind: 'record' | 'first';
  entryId: string;
  initialValues: ClaimFormValues;
  recordCategories: RecordCategoryRecord[];
  firstCategories: FirstCategoryRecord[];
  claimantId: string;
};

export default function AdminEditForm({ kind, entryId, initialValues, recordCategories, firstCategories, claimantId }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const back = `/admin/records-review/${kind}/${encodeURIComponent(entryId)}`;

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={async (values, { setSubmitting }) => {
        setErrors([]);
        const result = await adminUpdateEntry(kind, entryId, values, comment);
        setSubmitting(false);
        if (!result.success) { setErrors(result.errors); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
        router.push(back);
        router.refresh();
      }}
    >
      {({ isSubmitting, values, setFieldValue }) => (
        <Form className="stack gap-8">
          {errors.length > 0 && (
            <section className="p-4 sm:p-0">
              <Alert>
                <div className="stack gap-1">
                  <span>The changes could not be saved:</span>
                  <ul className="list-disc pl-5">{errors.map(e => <li key={e}>{e}</li>)}</ul>
                </div>
              </Alert>
            </section>
          )}
          <PathResetter onChange={() => setFieldValue('categoryId', '')} path={values.path} />
          <ClaimFields recordCategories={recordCategories} firstCategories={firstCategories} claimantId={claimantId} admin />
          <section className="p-4 sm:p-0 stack gap-2">
            <label htmlFor="modify-comment" className="text-sm font-medium text-gray-600">Reason for the change (shown in the history)</label>
            <input id="modify-comment" className="border border-gray-300 rounded px-3 py-2 text-sm" value={comment} onChange={e => setComment(e.target.value)} />
          </section>
          <section className="p-4 sm:p-0 flex gap-3">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="small" color="white" /> : 'Save changes'}
            </Button>
            <Button as="link" href={back} variant="secondary">Cancel</Button>
          </section>
        </Form>
      )}
    </Formik>
  );
}
