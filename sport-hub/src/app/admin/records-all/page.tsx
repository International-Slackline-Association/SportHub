import type { Metadata } from 'next';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import AdminNav from '../records-review/components/AdminNav';
import EntryTable from '../records-review/components/EntryTable';
import { getEveryEntry, toEntryRows } from '../records-review/components/rows';

export const metadata: Metadata = {
  title: 'SportHub - All Records and Firsts',
};

export default async function AllRecordsAndFirstsPage() {
  await requireAdmin();
  const rows = await toEntryRows(await getEveryEntry());

  return (
    <PageLayout
      title="All records and firsts"
      description="Every record and first in the workflow, whatever its status, drafts included. Click a line to see all details."
    >
      <AdminNav current="/admin/records-all" />
      <section className="p-4 sm:p-0">
        <EntryTable rows={rows} showKind showStatus filterable emptyText="No entries." />
      </section>
    </PageLayout>
  );
}
