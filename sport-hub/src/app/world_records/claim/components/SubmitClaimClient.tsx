'use client';

/**
 * The claimant's claim page (requirements §7.2): choose what is claimed, fill
 * in the record or first form, then save a draft, submit it for review or
 * delete the draft. Records and firsts each have their own form.
 */

import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FormikHelpers, FormikProps } from 'formik';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import Spinner from '@ui/Spinner';
import type { ClaimStatus, FirstCategoryTableItem, RecordCategoryTableItem } from '@lib/relational-types';
import { deleteDraft, saveClaim } from '../../actions';
import type { ClaimFormValues, ClaimPath } from '../types';
import type { EnsureClaimSaved } from './EvidenceFields';
import PathChoice, { kindOf } from './PathChoice';
import WorldFirstClaimForm from './WorldFirstClaimForm';
import WorldRecordClaimForm from './WorldRecordClaimForm';

type Props = {
  recordCategories: RecordCategoryTableItem[];
  firstCategories: FirstCategoryTableItem[];
  initialValues: ClaimFormValues;
  claimantId: string;
  reviewComment?: string;
  /** Status of a saved claim; undefined for a new one. */
  status?: ClaimStatus;
  uploadsEnabled: boolean;
};

const claimUrl = (kind: 'record' | 'first', entryId: string) => `/world_records/claim?kind=${kind}&id=${entryId}`;

export default function SubmitClaimClient({ recordCategories, firstCategories, initialValues, claimantId, reviewComment, status, uploadsEnabled }: Props) {
  const router = useRouter();
  const [path, setPath] = useState<ClaimPath>(initialValues.path);
  const [formStart, setFormStart] = useState(initialValues);
  const latestValues = useRef(initialValues);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [intent, setIntent] = useState<'draft' | 'submit'>('submit');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const kind = kindOf(path);

  const onValuesChange = useCallback((values: ClaimFormValues) => { latestValues.current = values; }, []);

  const changePath = (next: ClaimPath) => {
    // Switching between record and first starts the other form with what was typed so far
    if (kindOf(next) !== kind) setFormStart({ ...latestValues.current, path: next, categoryId: '' });
    setPath(next);
  };

  const showErrors = (list: string[]) => {
    setErrors(list);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Drafts are saved as they are; the full checks run on submit. */
  const saveDraft = async ({ values, setFieldValue }: FormikProps<ClaimFormValues>) => {
    setIntent('draft');
    setErrors([]);
    setMessage(null);
    setSaving(true);
    const result = await saveClaim(values, 'draft');
    setSaving(false);
    if (!result.success) { showErrors(result.errors); return; }
    setFieldValue('entryId', result.entryId);
    setMessage(result.message ?? 'Saved');
    router.replace(claimUrl(result.kind, result.entryId), { scroll: false });
  };

  const submit = async (values: ClaimFormValues, { setSubmitting }: FormikHelpers<ClaimFormValues>) => {
    setIntent('submit');
    setErrors([]);
    setMessage(null);
    const result = await saveClaim(values, 'submit');
    setSubmitting(false);
    if (!result.success) { showErrors(result.errors); return; }
    router.push(`/world_records/my-claims?submitted=${result.kind}:${result.entryId}`);
  };

  const removeDraft = async (entryId: string) => {
    if (!confirm('Delete this draft? This cannot be undone.')) return;
    setDeleting(true);
    const result = await deleteDraft(kind, entryId);
    setDeleting(false);
    if (!result.success) { showErrors(result.errors); return; }
    router.push('/world_records/my-claims');
  };

  /** Files go into a folder named after the claim's ID, so a new claim is saved as a draft first. */
  const formRef = useRef<FormikProps<ClaimFormValues> | null>(null);
  const ensureSaved: EnsureClaimSaved = async current => {
    if (current.entryId) return { kind: kindOf(current.path), entryId: current.entryId };
    setErrors([]);
    const result = await saveClaim(current, 'draft');
    if (!result.success) { showErrors(result.errors); return null; }
    formRef.current?.setFieldValue('entryId', result.entryId);
    setMessage('Draft saved, so files can be added to it.');
    // Only the address changes: a router navigation here would drop the upload's server action
    window.history.replaceState(null, '', claimUrl(result.kind, result.entryId));
    return { kind: result.kind, entryId: result.entryId };
  };

  const renderActions = (form: FormikProps<ClaimFormValues>) => {
    formRef.current = form;
    const busy = form.isSubmitting || saving;
    const isSavedDraft = !!form.values.entryId && (status ?? 'draft') === 'draft';
    return (
      <section className="p-4 sm:p-0 flex gap-3 flex-wrap">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => saveDraft(form)}>
          {saving ? <Spinner size="small" /> : 'Save draft'}
        </Button>
        <Button type="submit" variant="primary" disabled={busy}>
          {form.isSubmitting ? <Spinner size="small" color="white" /> : 'Submit for review'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (form.dirty && !confirm('Leave without saving? Your unsaved changes are lost.')) return;
            router.push('/world_records/my-claims');
          }}
        >
          Return to My Claims
        </Button>
        {isSavedDraft && (
          <Button type="button" variant="destructive-secondary" disabled={busy || deleting} onClick={() => removeDraft(form.values.entryId!)}>
            {deleting ? <Spinner size="small" /> : 'Delete draft'}
          </Button>
        )}
      </section>
    );
  };

  const shared = { claimantId, uploadsEnabled, ensureSaved, onSubmit: submit, onValuesChange, renderActions };

  return (
    <div className="stack gap-8">
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

      {/* A claim sent back for changes keeps what it claims, so the choice is not shown */}
      {status !== 'changes_requested' && (
        <PathChoice path={path} onChange={changePath} locked={!!initialValues.entryId} />
      )}

      {kind === 'first' ? (
        <WorldFirstClaimForm
          key="first"
          {...shared}
          initialValues={formStart}
          firstCategories={firstCategories}
        />
      ) : (
        <WorldRecordClaimForm
          key="record"
          {...shared}
          initialValues={formStart}
          path={path === 'first' ? undefined : path}
          recordCategories={recordCategories}
        />
      )}
    </div>
  );
}
