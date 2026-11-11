'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import type { ClaimStatus, RecordCategoryTableItem, FirstCategoryTableItem } from '@lib/relational-types';
import { OTHER_REJECTION_REASON, REJECTION_REASONS, type RejectionCase } from '@lib/records-rules';
import {
  approveClaim,
  rejectClaim,
  requestClaimChanges,
  setPublicEntryStatus,
} from 'src/app/admin/records-review/actions';

type Props = {
  kind: 'record' | 'first';
  entryId: string;
  status: ClaimStatus;
  /** Only an entry an admin voided after publication can be restored. */
  voided: boolean;
  isNewCategory: boolean;
  /** Which list of rejection reasons applies: new category, record, or first. */
  rejectionCase: RejectionCase;
  proposedName?: string;
  similarCategoryIds: string[];
  recordCategories: Pick<RecordCategoryTableItem, 'categoryId' | 'name' | 'group' | 'status'>[];
  firstCategories: Pick<FirstCategoryTableItem, 'categoryId' | 'name'>[];
  /** Firsts in the same category on other lists, to link the same trick (FR-21a). */
  trickLinkOptions: { id: string; label: string }[];
};

const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm';

export default function ReviewActions(props: Props) {
  const { kind, entryId, status } = props;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [changesComment, setChangesComment] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [categoryChoice, setCategoryChoice] = useState<'create' | 'map'>('create');
  const [mapTo, setMapTo] = useState(props.similarCategoryIds[0] ?? '');
  const [trickLink, setTrickLink] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const run = async (action: () => Promise<{ success: boolean; error?: string; notice?: string }>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await action();
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'Something went wrong'); return; }
    if (result.notice) setNotice(result.notice);
    setComment('');
    setApproveComment('');
    setChangesComment('');
    setRejectComment('');
    setRejectReason('');
    setOtherReason('');
    router.refresh();
  };

  const recordOptions = props.recordCategories.filter(c => c.status !== 'archived');
  const isMappingWithoutCategory = props.isNewCategory && categoryChoice === 'map' && !mapTo;
  const canReject = rejectReason === OTHER_REJECTION_REASON ? !!otherReason.trim() : !!rejectReason;

  return (
    <div className="stack gap-4">
      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="warning">{notice}</Alert>}

      {status === 'pending' && (
        <>
          <div className="stack gap-3 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold">Approve</h3>
            <p className="text-sm text-gray-600">Publish the claim and notify the claimant and athletes.</p>
            {props.isNewCategory && (
              <div className="stack gap-2 text-sm">
                <span className="font-medium">Proposed category: {props.proposedName}</span>
                <label className="flex gap-2 items-center">
                  <input type="radio" checked={categoryChoice === 'create'} onChange={() => setCategoryChoice('create')} />
                  Create it (starts as Unchallenged)
                </label>
                <label className="flex gap-2 items-center">
                  <input type="radio" checked={categoryChoice === 'map'} onChange={() => setCategoryChoice('map')} />
                  Map the claim to an existing category
                </label>
                {categoryChoice === 'map' && (
                  <select className={inputClass} value={mapTo} onChange={e => setMapTo(e.target.value)}>
                    <option value="">Choose a category</option>
                    {recordOptions.map(c => <option key={c.categoryId} value={c.categoryId}>{c.group} · {c.name}</option>)}
                  </select>
                )}
              </div>
            )}
            {kind === 'first' && props.trickLinkOptions.length > 0 && (
              <div className="stack gap-1 text-sm">
                <label className="font-medium" htmlFor="trick-link">Same trick on another list</label>
                <select id="trick-link" className={inputClass} value={trickLink} onChange={e => setTrickLink(e.target.value)}>
                  <option value="">Not the same trick as an existing first</option>
                  {props.trickLinkOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                </select>
                <small className="text-gray-500">For reference only: titles follow the gender (Men&apos;s / Women&apos;s / Mixed World First).</small>
              </div>
            )}
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Comment to the claimant (optional)"
              aria-label="Approval comment"
              value={approveComment}
              onChange={e => setApproveComment(e.target.value)}
            />
            <div>
              <Button
                variant="primary"
                disabled={busy || isMappingWithoutCategory}
                onClick={() => run(() => approveClaim(kind, entryId, {
                  comment: approveComment,
                  createCategory: props.isNewCategory && categoryChoice === 'create',
                  mapToCategoryId: props.isNewCategory && categoryChoice === 'map' ? mapTo : undefined,
                  trickGroupWithEntryId: trickLink || undefined,
                }))}
              >
                Approve
              </Button>
            </div>
          </div>

          <div className="stack gap-3 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold">Request changes</h3>
            <p className="text-sm text-gray-600">Send the claim back to the claimant with what to fix.</p>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="What should the claimant change? (required)"
              aria-label="Requested changes"
              value={changesComment}
              onChange={e => setChangesComment(e.target.value)}
            />
            <div>
              <Button variant="secondary" disabled={busy || !changesComment.trim()} onClick={() => run(() => requestClaimChanges(kind, entryId, changesComment))}>
                Request changes
              </Button>
            </div>
          </div>

          <div className="stack gap-3 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold">Reject</h3>
            <div className="stack gap-1 text-sm">
              <label className="font-medium" htmlFor="reject-reason">Reason for rejection</label>
              <select id="reject-reason" className={inputClass} value={rejectReason} onChange={e => setRejectReason(e.target.value)}>
                <option value="">Choose a reason</option>
                {REJECTION_REASONS[props.rejectionCase].map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
                <option value={OTHER_REJECTION_REASON}>Other</option>
              </select>
              {rejectReason === OTHER_REJECTION_REASON && (
                <input
                  className={inputClass}
                  placeholder="Describe the reason (required)"
                  aria-label="Other reason"
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                />
              )}
            </div>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="Comment to the claimant (optional)"
              aria-label="Rejection comment"
              value={rejectComment}
              onChange={e => setRejectComment(e.target.value)}
            />
            <div>
              <Button
                variant="destructive"
                disabled={busy || !canReject}
                onClick={() => run(() => rejectClaim(kind, entryId, { reason: rejectReason, otherReason, comment: rejectComment }))}
              >
                Reject
              </Button>
            </div>
          </div>
        </>
      )}

      {(status === 'published' || status === 'historical') && (
        <div className="stack gap-2 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold">Void this entry</h3>
          <p className="text-sm text-gray-600">For example a fair-play violation found after publication. The entry is removed from the public lists.</p>
          <textarea className={inputClass} rows={2} placeholder="Reason (required)" value={comment} onChange={e => setComment(e.target.value)} />
          <div>
            <Button variant="destructive" disabled={busy || !comment.trim()} onClick={() => run(() => setPublicEntryStatus(kind, entryId, 'rejected', comment))}>
              Void
            </Button>
          </div>
        </div>
      )}
      {status === 'rejected' && props.voided && (
        <div className="stack gap-2 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold">Restore</h3>
          <textarea className={inputClass} rows={2} placeholder="Reason (required)" value={comment} onChange={e => setComment(e.target.value)} />
          <div>
            <Button variant="secondary" disabled={busy || !comment.trim()} onClick={() => run(() => setPublicEntryStatus(kind, entryId, 'published', comment))}>
              Restore and publish
            </Button>
          </div>
        </div>
      )}

      <div className="stack gap-2 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold">Modify</h3>
        <p className="text-sm text-gray-600">Edit every detail: category, value or trick, athletes, date, location, witnesses and links.</p>
        <div>
          <Button as="link" href={`/admin/records-review/${kind}/${encodeURIComponent(entryId)}/edit`} variant="secondary">Modify</Button>
        </div>
      </div>
    </div>
  );
}
