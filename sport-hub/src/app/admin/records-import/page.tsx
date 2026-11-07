import type { Metadata } from 'next';
import AdminNav from '../records-review/components/AdminNav';
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
      <AdminNav current="/admin/records-import" />
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
