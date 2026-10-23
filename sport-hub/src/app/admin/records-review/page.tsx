import type { Metadata } from 'next';
import Link from 'next/link';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import { formatEntryDate, LIST_LABELS } from '@lib/records-logic';
import { getReviewQueue } from 'src/app/world_records/actions';

export const metadata: Metadata = {
  title: 'SportHub - Record Review',
};

export default async function RecordsReviewPage() {
  await requireAdmin();
  const queue = await getReviewQueue();

  return (
    <PageLayout title="Records and firsts review" description="Claims waiting for a decision, oldest first.">
      <section className="p-4 sm:p-0 flex gap-4 flex-wrap text-sm">
        <Link href="/admin/records-categories" className="text-blue-600 hover:underline">Categories</Link>
        <Link href="/admin/records-import" className="text-blue-600 hover:underline">Import review</Link>
      </section>
      <section className="p-4 sm:p-0">
        {queue.length === 0 ? (
          <p className="text-gray-600">No claims are waiting for review.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-2 pr-3">Submitted</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 pr-3">Claim</th>
                  <th className="py-2 pr-3">Athletes</th>
                  <th className="py-2 pr-3">List</th>
                </tr>
              </thead>
              <tbody>
                {queue.map(entry => (
                  <tr key={`${entry.kind}-${entry.entryId}`} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-3 whitespace-nowrap">{entry.submittedAt ? new Date(entry.submittedAt).toISOString().slice(0, 10) : '—'}</td>
                    <td className="py-2 pr-3">{entry.kind === 'first' ? 'First' : 'Record'}</td>
                    <td className="py-2 pr-3">
                      {entry.categoryName}
                      {entry.kind === 'record' && entry.newCategoryProposal && <span className="ml-1 text-xs text-amber-700">(new category)</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <Link href={`/admin/records-review/${entry.kind}/${entry.entryId}`} className="text-blue-600 hover:underline">
                        {entry.kind === 'first' ? entry.trickName : entry.value.original}
                      </Link>
                      {entry.date && <span className="text-gray-500"> · {formatEntryDate(entry.date)}</span>}
                    </td>
                    <td className="py-2 pr-3">{entry.athletes.map(a => a.name).join(', ')}</td>
                    <td className="py-2 pr-3">{LIST_LABELS[entry.list]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageLayout>
  );
}
