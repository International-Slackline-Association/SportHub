import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import AdminNav from '../../records-review/components/AdminNav';
import EntryTable from '../../records-review/components/EntryTable';
import { getAllEntries, toEntryRows } from '../../records-review/components/rows';

export const metadata: Metadata = {
  title: 'SportHub - Modify Records and Firsts',
};

type Props = { params: Promise<{ kind: string }> };

export default async function ManageEntriesPage({ params }: Props) {
  await requireAdmin();
  const { kind: segment } = await params;
  const kind = segment === 'records' ? 'record' : segment === 'firsts' ? 'first' : null;
  if (!kind) notFound();
  const rows = await toEntryRows(await getAllEntries(kind));

  return (
    <PageLayout
      title={kind === 'record' ? 'Modify records' : 'Modify firsts'}
      description="All entries except drafts. Click a line to see all details and modify, approve, reject or void it."
    >
      <AdminNav current={`/admin/records-manage/${segment}`} />
      <section className="p-4 sm:p-0">
        <EntryTable rows={rows} showStatus filterable emptyText="No entries." />
      </section>
    </PageLayout>
  );
}
