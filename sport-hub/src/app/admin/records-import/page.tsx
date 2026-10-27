import type { Metadata } from 'next';
import Link from 'next/link';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import { getFirstCategories, getRecordCategories } from '@lib/records-service';
import { listImportIssues } from './actions';
import ImportIssueList from './ImportIssueList';

export const metadata: Metadata = {
  title: 'SportHub - Import Review',
};

export default async function RecordsImportPage() {
  await requireAdmin();
  const [issues, recordCategories, firstCategories] = await Promise.all([listImportIssues(), getRecordCategories(), getFirstCategories()]);

  return (
    <PageLayout
      title="Import review"
      description="Rows from the certificates sheet that need a decision. Rows without a category or a readable value were not imported; the others were imported and only need checking."
    >
      <section className="p-4 sm:p-0 flex gap-4 text-sm">
        <Link href="/admin/records-review" className="text-blue-600 hover:underline">Review queue</Link>
        <Link href="/admin/records-categories" className="text-blue-600 hover:underline">Categories</Link>
      </section>
      <section className="p-4 sm:p-0">
        <ImportIssueList
          issues={issues}
          recordCategories={recordCategories.sort((a, b) => a.order - b.order).map(c => ({ categoryId: c.categoryId, label: `${c.group} · ${c.name}${c.status === 'archived' ? ' (archived)' : ''}` }))}
          firstCategories={firstCategories.map(c => ({ categoryId: c.categoryId, label: c.name }))}
        />
      </section>
    </PageLayout>
  );
}
