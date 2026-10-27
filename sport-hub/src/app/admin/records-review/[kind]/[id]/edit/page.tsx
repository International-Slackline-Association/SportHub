import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import { getRecordCategories, getFirstCategories, getEntry } from '@lib/records-service';
import { entryToClaimValues } from 'src/app/world_records/claim/types';
import AdminEditForm from './AdminEditForm';

export const metadata: Metadata = {
  title: 'SportHub - Modify Entry',
};

type Props = { params: Promise<{ kind: string; id: string }> };

export default async function ModifyEntryPage({ params }: Props) {
  await requireAdmin();
  const { kind, id } = await params;
  if (kind !== 'record' && kind !== 'first') notFound();
  const entryId = decodeURIComponent(id);
  const [entry, recordCategories, firstCategories] = await Promise.all([
    getEntry(kind, entryId),
    getRecordCategories(),
    getFirstCategories(),
  ]);
  if (!entry) notFound();

  const values = entryToClaimValues(entry);
  // An imported entry may sit in an archived category: keep it selectable
  const categories = recordCategories
    .filter(c => c.status !== 'archived' || c.categoryId === entry.categoryId)
    .sort((a, b) => a.order - b.order);

  return (
    <PageLayout title={entry.kind === 'first' ? `Modify first: ${entry.trickName}` : `Modify record: ${entry.categoryName}`}>
      <section className="p-4 sm:p-0">
        <Link href={`/admin/records-review/${kind}/${encodeURIComponent(entryId)}`} className="text-blue-600 hover:underline text-sm">Back to the details</Link>
      </section>
      <AdminEditForm
        kind={kind}
        entryId={entryId}
        initialValues={values}
        recordCategories={categories}
        firstCategories={firstCategories}
        claimantId={entry.claimantUserId ?? ''}
      />
    </PageLayout>
  );
}
