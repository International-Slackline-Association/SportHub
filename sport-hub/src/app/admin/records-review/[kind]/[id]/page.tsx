import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageLayout from '@ui/PageLayout';
import { Alert } from '@ui/Alert';
import { requireAdmin } from '@lib/authorization';
import { formatEntryDate, formatRecordValue, GENDER_LABELS, LIST_LABELS, RECORD_LISTS } from '@lib/records-logic';
import { FIRST_CRITERIA, RECORD_CRITERIA } from '@lib/records-rules';
import type { RecordCategoryRecord } from '@lib/relational-types';
import { getReviewContext } from 'src/app/world_records/actions';
import { ClaimStatusBadge } from 'src/app/world_records/components/claimStatus';
import ReviewActions from './ReviewActions';

export const metadata: Metadata = {
  title: 'SportHub - Review Claim',
};

type Props = { params: Promise<{ kind: string; id: string }> };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  if (children === undefined || children === null || children === '') return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 py-1 border-b border-gray-100">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm whitespace-pre-wrap">{children}</span>
    </div>
  );
}

export default async function ReviewClaimPage({ params }: Props) {
  await requireAdmin();
  const { kind, id } = await params;
  if (kind !== 'record' && kind !== 'first') notFound();
  const context = await getReviewContext(kind, id);
  if (!context) notFound();
  const { entry, audit, category, currentByList, similar, recordCategories, firstCategories, unchallengedPrompt } = context;

  const recordCategory = entry.kind === 'record' ? (category as RecordCategoryRecord | null) : null;
  const isNewCategory = entry.kind === 'record' && !!entry.newCategoryProposal && entry.categoryId.startsWith('proposed-');
  const valueText = entry.kind === 'record'
    ? (recordCategory ? formatRecordValue(recordCategory, entry.value) : entry.value.original)
    : undefined;

  return (
    <PageLayout title={entry.kind === 'first' ? `First: ${entry.trickName}` : `Record: ${entry.categoryName}`}>
      <section className="p-4 sm:p-0 flex gap-3 items-center flex-wrap">
        <Link href="/admin/records-review" className="text-blue-600 hover:underline text-sm">Back to the review queue</Link>
        <Link href={`/admin/records-manage/${entry.kind === 'first' ? 'firsts' : 'records'}`} className="text-blue-600 hover:underline text-sm">All {entry.kind === 'first' ? 'firsts' : 'records'}</Link>
        <ClaimStatusBadge status={entry.status} />
        <span className="text-sm text-gray-600">Gender: {GENDER_LABELS[entry.list]}</span>
        {entry.source === 'import' && <span className="text-sm text-gray-500">Imported from the sheet</span>}
      </section>

      {unchallengedPrompt && (
        <section className="p-4 sm:p-0">
          <Alert variant="warning">This category is Unchallenged and already has a record. If it is now challenged, set it to Active on the <Link href="/admin/records-categories" className="underline">categories page</Link>.</Alert>
        </section>
      )}

      <section className="p-4 sm:p-0 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="stack gap-6">
          <div className="stack">
            <h3 className="text-lg font-semibold mb-2">Claim</h3>
            <Row label="Category">{entry.categoryName}{isNewCategory && ' (proposed new category)'}</Row>
            {entry.kind === 'record' && entry.newCategoryProposal && (
              <>
                <Row label="What is measured">{entry.newCategoryProposal.measurement}</Row>
                <Row label="Unit and direction">{`${entry.newCategoryProposal.unit}, ${entry.newCategoryProposal.direction} is better`}</Row>
                <Row label="Why distinct">{entry.newCategoryProposal.justification}</Row>
              </>
            )}
            {entry.kind === 'record' && <Row label="Value">{valueText}{entry.value.original && entry.value.original !== valueText ? ` (as entered: ${entry.value.original})` : ''}</Row>}
            {entry.kind === 'first' && (
              <>
                <Row label="Trick">{entry.trickName}</Row>
                <Row label="Description">{entry.description}</Row>
                <Row label="Why it is a first">{entry.whyFirst}</Row>
                <Row label="Similar tricks">{entry.similarTricks}</Row>
                <Row label="Line">{entry.lineDetails}</Row>
              </>
            )}
            <Row label="Athletes">
              {entry.athletes.map((a, i) => (
                <span key={i} className="block">
                  {a.userId ? <Link href={`/athlete/${a.userId}`} className="text-blue-600 hover:underline">{a.name}</Link> : a.name}
                  {` · ${a.gender === 'MEN' ? 'male' : 'female'}`}{a.country ? ` · ${a.country}` : ''}
                  {a.pendingUser && ` · new athlete (${a.pendingUser.email}), profile created on approval`}
                  {(entry.status === 'published' || entry.status === 'historical') && (
                    <> · <a href={`/api/certificates/${entry.kind}/${entry.entryId}?athlete=${i}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">certificate</a></>
                  )}
                </span>
              ))}
            </Row>
            {entry.athletes.length > 1 && <Row label="Joint performance">Confirmed by the claimant</Row>}
            <Row label="Date">{entry.date ? formatEntryDate(entry.date) : undefined}</Row>
            <Row label="Location">{[entry.locationName, entry.locationCountry].filter(Boolean).join(', ')}</Row>
            {entry.kind === 'record' && (
              <>
                <Row label="Setup">{entry.setup}</Row>
                <Row label="Further specs">{entry.furtherSpecs}</Row>
                <Row label="Witnesses">
                  {entry.witnesses.length > 0 ? entry.witnesses.map((w, i) => <span key={i} className="block">{w.name} · {w.role} · {w.contact}</span>) : undefined}
                </Row>
                <Row label="No full video because">{entry.noFullVideoReason}</Row>
              </>
            )}
            <Row label="Evidence">
              {entry.evidence.length > 0 ? entry.evidence.map(e => (
                <a key={e.url} href={e.url} target="_blank" rel="noreferrer" className="block text-blue-600 hover:underline break-all">{e.url}</a>
              )) : undefined}
            </Row>
            <Row label="Claimant">{entry.claimantName}</Row>
            <Row label="Consent of athletes">{entry.consentConfirmed ? 'Confirmed' : undefined}</Row>
            <Row label="Ethics">{entry.ethicsConfirmed ? 'Confirmed' : undefined}</Row>
            <Row label="Review comment">{entry.reviewComment}</Row>
          </div>

          <div className="stack gap-2">
            <h3 className="text-lg font-semibold">History</h3>
            {audit.length === 0 ? <p className="text-sm text-gray-500">No entries.</p> : (
              <ul className="text-sm stack gap-1">
                {audit.map(a => (
                  <li key={a.sortKey}>
                    <span className="text-gray-500">{new Date(a.at).toISOString().slice(0, 16).replace('T', ' ')}</span>{' '}
                    <strong>{a.action.replace(/_/g, ' ')}</strong>{a.byName && ` by ${a.byName}`}{a.comment && `: ${a.comment}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="stack gap-6">
          <ReviewActions
            kind={entry.kind}
            entryId={entry.entryId}
            status={entry.status}
            isNewCategory={isNewCategory}
            proposedName={entry.kind === 'record' ? entry.newCategoryProposal?.name : undefined}
            similarCategoryIds={entry.kind === 'record' ? similar.map(s => s.id) : []}
            recordCategories={recordCategories.map(({ categoryId, name, group, status }) => ({ categoryId, name, group, status }))}
            firstCategories={firstCategories.map(({ categoryId, name }) => ({ categoryId, name }))}
            trickLinkOptions={entry.kind === 'first' ? similar.filter(s => s.id !== entry.entryId).map(s => ({ id: s.id, label: `${s.label} · ${s.detail ?? ''}` })) : []}
          />

          {entry.kind === 'record' && (
            <div className="stack gap-2">
              <h3 className="font-semibold">Current records in this category</h3>
              {isNewCategory ? <p className="text-sm text-gray-500">New category, no records yet.</p> : RECORD_LISTS.map(list => (
                <div key={list} className="text-sm">
                  <span className="font-medium">{LIST_LABELS[list]}:</span>{' '}
                  {currentByList[list] ? `${currentByList[list]!.value} by ${currentByList[list]!.holders.join(', ')} (${formatEntryDate(currentByList[list]!.date)})` : 'none'}
                </div>
              ))}
            </div>
          )}

          {similar.length > 0 && (
            <div className="stack gap-2">
              <h3 className="font-semibold">{entry.kind === 'first' ? 'Firsts in this discipline' : 'Similar categories'}</h3>
              <ul className="text-sm stack gap-1 max-h-80 overflow-auto">
                {similar.map(s => <li key={s.id}>{s.label}{s.detail && <span className="text-gray-500"> · {s.detail}</span>}</li>)}
              </ul>
            </div>
          )}

          {/* Record criteria decide whether a proposed category is accepted, so they only show for new categories. */}
          {(entry.kind === 'first' || isNewCategory) && (
            <div className="stack gap-2">
              <h3 className="font-semibold">{entry.kind === 'first' ? 'World first criteria' : 'World record criteria'}</h3>
              <ul className="text-sm stack gap-1">
                {(entry.kind === 'first' ? FIRST_CRITERIA : RECORD_CRITERIA).map(c => (
                  <li key={c.name}><strong>{c.name}:</strong> {c.text}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </PageLayout>
  );
}
