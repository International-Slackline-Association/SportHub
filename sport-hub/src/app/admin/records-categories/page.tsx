import type { Metadata } from 'next';
import AdminNav from '../records-review/components/AdminNav';
import Button from '@ui/Button';
import PageLayout from '@ui/PageLayout';
import { requireRecordManager } from '@lib/authorization';
import { getFirstCategories, getRecordCategories } from '@lib/records-service';
import { FirstCategoriesTable, RecordCategoriesTable } from './components/CategoriesTable';
import { categoryHref } from './components/statusOptions';

export const metadata: Metadata = {
  title: 'SportHub - Record Categories',
};

export default async function RecordCategoriesPage() {
  await requireRecordManager();
  const [recordCategories, firstCategories] = await Promise.all([getRecordCategories(), getFirstCategories()]);
  recordCategories.sort((a, b) => a.order - b.order);
  firstCategories.sort((a, b) => a.order - b.order);

  return (
    <PageLayout
      title="Record categories"
      description="Click a category to see its details and modify or delete it. Active: the best performance is the World Record. Unchallenged: one achievement nobody has equalled or beaten yet, not a World Record; an approved claim that equals or beats it makes the category Active automatically. Archived: no new claims; the best performance is a Historical World Record."
    >
      <AdminNav current="/admin/records-categories" />
      <section className="p-4 sm:p-0 stack gap-6">
        <div className="stack gap-3">
          <h3 className="text-lg font-semibold">World record categories</h3>
          <div><Button as="link" href={categoryHref('record', 'new')} variant="secondary">Add a record category</Button></div>
          <RecordCategoriesTable categories={recordCategories} />
        </div>
        <div className="stack gap-3">
          <h3 className="text-lg font-semibold">World first disciplines</h3>
          <div><Button as="link" href={categoryHref('first', 'new')} variant="secondary">Add a first discipline</Button></div>
          <FirstCategoriesTable categories={firstCategories} />
        </div>
      </section>
    </PageLayout>
  );
}
