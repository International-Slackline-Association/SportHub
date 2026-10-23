import type { Metadata } from 'next';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import { getReviewQueue } from 'src/app/world_records/actions';
import AdminNav from './components/AdminNav';
import EntryTable from './components/EntryTable';
import { toEntryRows } from './components/rows';

export const metadata: Metadata = {
  title: 'SportHub - Record Review',
};

export default async function RecordsReviewPage() {
  await requireAdmin();
  const rows = await toEntryRows(await getReviewQueue());

  return (
    <PageLayout title="Records and firsts review" description="Claims waiting for a decision, oldest first. Click a line to see all details.">
      <AdminNav current="/admin/records-review" />
      <section className="p-4 sm:p-0 stack gap-2">
        <h3 className="text-lg font-semibold">World records</h3>
        <EntryTable rows={rows.filter(r => r.kind === 'record' && !r.newCategory)} emptyText="No record claims are waiting for review." />
      </section>
      <section className="p-4 sm:p-0 stack gap-2">
        <h3 className="text-lg font-semibold">World records in a new category</h3>
        <p className="text-sm text-gray-600">Approving creates the category (as Unchallenged) or maps the claim to an existing one.</p>
        <EntryTable rows={rows.filter(r => r.newCategory)} emptyText="No claims for new categories are waiting for review." />
      </section>
      <section className="p-4 sm:p-0 stack gap-2">
        <h3 className="text-lg font-semibold">World firsts</h3>
        <EntryTable rows={rows.filter(r => r.kind === 'first')} emptyText="No first claims are waiting for review." />
      </section>
    </PageLayout>
  );
}
