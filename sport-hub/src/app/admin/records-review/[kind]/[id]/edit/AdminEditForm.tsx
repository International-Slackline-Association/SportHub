'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormikHelpers, FormikProps } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import Spinner from '@ui/Spinner';
import type { FirstCategoryTableItem, RecordCategoryTableItem } from '@lib/relational-types';
import { adminUpdateEntry } from 'src/app/admin/records-review/actions';
import PathChoice from 'src/app/world_records/claim/components/PathChoice';
import WorldFirstClaimForm from 'src/app/world_records/claim/components/WorldFirstClaimForm';
import WorldRecordClaimForm from 'src/app/world_records/claim/components/WorldRecordClaimForm';
import type { ClaimFormValues, ClaimPath } from 'src/app/world_records/claim/types';

type Props = {
  kind: 'record' | 'first';
  entryId: string;
  initialValues: ClaimFormValues;
  recordCategories: RecordCategoryTableItem[];
  firstCategories: FirstCategoryTableItem[];
  claimantId: string;
  uploadsEnabled: boolean;
};

/** The admin "Modify" form: the claimant's fields without their confirmations, plus a reason for the change. */
export default function AdminEditForm({ kind, entryId, initialValues, recordCategories, firstCategories, claimantId, uploadsEnabled }: Props) {
  const router = useRouter();
  const [errors, setErrors] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [path, setPath] = useState<ClaimPath>(initialValues.path);
  const back = `/admin/records-review/${kind}/${encodeURIComponent(entryId)}`;

  const save = async (values: ClaimFormValues, { setSubmitting }: FormikHelpers<ClaimFormValues>) => {
    setErrors([]);
    const result = await adminUpdateEntry(kind, entryId, values, comment);
    setSubmitting(false);
    if (!result.success) { setErrors(result.errors); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    router.push(back);
    router.refresh();
  };

  const renderActions = ({ isSubmitting }: FormikProps<ClaimFormValues>) => (
    <>
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
    </>
  );

  const shared = {
    initialValues,
    claimantId,
    admin: true,
    uploadsEnabled,
    ensureSaved: async () => ({ kind, entryId }),
    onSubmit: save,
    renderActions,
  };

  return (
    <div className="stack gap-8">
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
      {kind === 'first' ? (
        <WorldFirstClaimForm {...shared} firstCategories={firstCategories} />
      ) : (
        <>
          <PathChoice path={path} onChange={setPath} locked showAttemptHint={false} />
          <WorldRecordClaimForm {...shared} path={path === 'first' ? undefined : path} recordCategories={recordCategories} />
        </>
      )}
    </div>
  );
}
