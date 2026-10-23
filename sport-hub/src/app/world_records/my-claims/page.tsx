import type { Metadata } from 'next';
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
        <Button as="link" href="/world_records/claim" variant="primary">Claim World Record or World First</Button>
      </section>
      <section className="p-4 sm:p-0">
        {sorted.length === 0 ? (
          <p className="text-gray-600">You have no claims yet.</p>
        ) : (
          <div className="stack gap-2">
            {sorted.map(entry => {
              const editable = entry.status === 'draft' || entry.status === 'changes_requested';
              return (
                <div key={`${entry.kind}-${entry.entryId}`} className="border border-gray-200 rounded-lg px-4 py-3 stack gap-2">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                    <div className="stack min-w-0">
                      <span className="font-semibold">
                        {entry.kind === 'record' && entry.newCategoryProposal ? '[New category] ' : ''}{entry.categoryName || 'No category chosen'}
                        {valueOf(entry) && <span className="font-normal"> · {valueOf(entry)}</span>}
                      </span>
                      <span className="text-sm text-gray-600">
                        {entry.kind === 'first' ? 'World first' : 'World record'} · {LIST_LABELS[entry.list]}
                        {' · '}{entry.athletes.map(a => a.name).join(', ') || 'No athletes yet'}
                        {entry.date && ` · ${formatEntryDate(entry.date)}`}
                        {entry.locationName && ` · ${entry.locationName}`}
                      </span>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {editable && entry.claimantUserId === session?.user?.id && (
                        <Button as="link" href={`/world_records/claim?kind=${entry.kind}&id=${entry.entryId}`} variant="secondary" size="small">
                          {entry.status === 'draft' ? 'Edit draft' : 'Make changes'}
                        </Button>
                      )}
                      {entry.status === 'pending' && <WithdrawButton kind={entry.kind} entryId={entry.entryId} />}
                      {(entry.status === 'published' || entry.status === 'historical') && entry.athletes.map((a, i) => (
                        <Button key={i} as="link" href={`/api/certificates/${entry.kind}/${entry.entryId}?athlete=${i}`} variant="secondary" size="small">
                          Certificate{entry.athletes.length > 1 ? ` (${a.name})` : ''}
                        </Button>
                      ))}
                    </div>
                    <div className="ml-auto"><ClaimStatusBadge status={entry.status} /></div>
                  </div>
                  {entry.reviewComment && ['changes_requested', 'rejected'].includes(entry.status) && (
                    <Alert variant={entry.status === 'rejected' ? 'error' : 'warning'} size="SM">ISA: {entry.reviewComment}</Alert>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="p-4 sm:p-0">
        <Button as="link" href="/world_records" variant="secondary" size="small">Back to Records &amp; Firsts</Button>
      </section>
    </PageLayout>
  );
}
