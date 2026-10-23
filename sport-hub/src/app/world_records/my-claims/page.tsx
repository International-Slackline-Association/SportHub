import type { Metadata } from 'next';
import Link from 'next/link';
import PageLayout from '@ui/PageLayout';
import Button from '@ui/Button';
import { Alert } from '@ui/Alert';
import { auth } from '@lib/auth';
import { getRecordCategories } from '@lib/records-service';
import { formatEntryDate, formatRecordValue, LIST_LABELS } from '@lib/records-logic';
import type { WorldEntryRecord } from '@lib/relational-types';
import { getMyClaims } from '../actions';
import { ClaimStatusBadge } from '../components/claimStatus';
import WithdrawButton from './WithdrawButton';

export const metadata: Metadata = {
  title: 'SportHub - My Record Claims',
};

type Props = { searchParams: Promise<{ submitted?: string }> };

export default async function MyClaimsPage({ searchParams }: Props) {
  const { submitted } = await searchParams;
  const [session, claims, categories] = await Promise.all([auth(), getMyClaims(), getRecordCategories()]);
  const categoryById = new Map(categories.map(c => [c.categoryId, c]));
  const sorted = [...claims].sort((a, b) => b.updatedAt - a.updatedAt);

  const valueOf = (entry: WorldEntryRecord) => {
    if (entry.kind === 'first') return entry.trickName;
    const category = categoryById.get(entry.categoryId);
    return category ? formatRecordValue(category, entry.value) : entry.value.original ?? '';
  };

  return (
    <PageLayout title="My claims" description="World record and world first claims you submitted or are an athlete on.">
      {submitted && (
        <section className="p-4 sm:p-0">
          <Alert variant="success">Your claim was sent to the ISA for review. You get an email when it is decided.</Alert>
        </section>
      )}
      <section className="p-4 sm:p-0 flex gap-3 flex-wrap">
        <Button as="link" href="/world_records/claim" variant="primary">Claim a world record or first</Button>
      </section>
      <section className="p-4 sm:p-0">
        {sorted.length === 0 ? (
          <p className="text-gray-600">You have no claims yet.</p>
        ) : (
          <div className="stack gap-3">
            {sorted.map(entry => {
              const editable = entry.status === 'draft' || entry.status === 'changes_requested';
              return (
                <div key={`${entry.kind}-${entry.entryId}`} className="border border-gray-200 rounded-lg p-4 stack gap-2">
                  <div className="flex justify-between gap-2 flex-wrap items-start">
                    <div className="stack gap-1">
                      <span className="text-xs uppercase text-gray-500">{entry.kind === 'first' ? 'World first' : 'World record'} · {LIST_LABELS[entry.list]}</span>
                      <span className="font-semibold">{entry.categoryName || 'No category chosen'}{entry.kind === 'record' && entry.newCategoryProposal ? ' (new category)' : ''}</span>
                      <span>{valueOf(entry) || '—'}</span>
                      <span className="text-sm text-gray-600">
                        {entry.athletes.map(a => a.name).join(', ') || 'No athletes yet'}
                        {entry.date && ` · ${formatEntryDate(entry.date)}`}
                        {entry.locationName && ` · ${entry.locationName}`}
                      </span>
                    </div>
                    <ClaimStatusBadge status={entry.status} />
                  </div>
                  {entry.reviewComment && ['changes_requested', 'rejected'].includes(entry.status) && (
                    <Alert variant={entry.status === 'rejected' ? 'error' : 'warning'} size="SM">ISA: {entry.reviewComment}</Alert>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {editable && entry.claimantUserId === session?.user?.id && (
                      <Button as="link" href={`/world_records/claim?kind=${entry.kind}&id=${entry.entryId}`} variant="secondary" size="small">
                        {entry.status === 'draft' ? 'Edit draft' : 'Make changes'}
                      </Button>
                    )}
                    {entry.status === 'pending' && <WithdrawButton kind={entry.kind} entryId={entry.entryId} />}
                    {(entry.status === 'published' || entry.status === 'historical') && entry.athletes.map((a, i) => (
                      <Button key={i} as="link" href={`/api/certificates/${entry.kind}/${entry.entryId}?athlete=${i}`} variant="ghost" size="small">
                        Certificate{entry.athletes.length > 1 ? ` (${a.name})` : ''}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="p-4 sm:p-0">
        <Link href="/world_records" className="text-blue-600 hover:underline">Back to world records</Link>
      </section>
    </PageLayout>
  );
}
