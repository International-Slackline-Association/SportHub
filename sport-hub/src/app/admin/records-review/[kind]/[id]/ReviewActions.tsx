'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import type { ClaimStatus, RecordCategoryRecord, FirstCategoryRecord } from '@lib/relational-types';
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
  proposedName?: string;
  similarCategoryIds: string[];
  recordCategories: Pick<RecordCategoryRecord, 'categoryId' | 'name' | 'group' | 'status'>[];
  firstCategories: Pick<FirstCategoryRecord, 'categoryId' | 'name'>[];
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
  const [categoryChoice, setCategoryChoice] = useState<'create' | 'map'>('create');
  const [mapTo, setMapTo] = useState(props.similarCategoryIds[0] ?? '');
  const [trickLink, setTrickLink] = useState('');

  const run = async (action: () => Promise<{ success: boolean; error?: string; notice?: string }>) => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await action();
    setBusy(false);
    if (!result.success) { setError(result.error ?? 'Something went wrong'); return; }
    if (result.notice) setNotice(result.notice);
    setComment('');
    router.refresh();
  };

  const recordOptions = props.recordCategories.filter(c => c.status !== 'archived');

  return (
    <div className="stack gap-4">
      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="warning">{notice}</Alert>}

      {status === 'pending' && (
        <div className="stack gap-3 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold">Decision</h3>
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
              <small className="text-gray-500">Linking decides the titles: the earliest landing across lists is the World First.</small>
            </div>
          )}
          <textarea
            className={inputClass}
            rows={3}
            placeholder="Comment to the claimant (required to reject or request changes)"
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="primary"
              disabled={busy || (props.isNewCategory && categoryChoice === 'map' && !mapTo)}
              onClick={() => run(() => approveClaim(kind, entryId, {
                comment,
                createCategory: props.isNewCategory && categoryChoice === 'create',
                mapToCategoryId: props.isNewCategory && categoryChoice === 'map' ? mapTo : undefined,
                trickGroupWithEntryId: trickLink || undefined,
              }))}
            >
              Approve
            </Button>
            <Button variant="secondary" disabled={busy || !comment.trim()} onClick={() => run(() => requestClaimChanges(kind, entryId, comment))}>
              Request changes
            </Button>
            <Button variant="destructive" disabled={busy || !comment.trim()} onClick={() => run(() => rejectClaim(kind, entryId, comment))}>
              Reject
            </Button>
          </div>
        </div>
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
