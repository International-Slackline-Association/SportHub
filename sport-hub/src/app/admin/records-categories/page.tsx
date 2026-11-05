import type { Metadata } from 'next';
import AdminNav from '../records-review/components/AdminNav';
import PageLayout from '@ui/PageLayout';
import { requireAdmin } from '@lib/authorization';
import { getFirstCategories, getRecordCategories } from '@lib/records-service';
import CategoriesEditor from './CategoriesEditor';

export const metadata: Metadata = {
  title: 'SportHub - Record Categories',
};

export default async function RecordCategoriesPage() {
  await requireAdmin();
  const [recordCategories, firstCategories] = await Promise.all([getRecordCategories(), getFirstCategories()]);
  recordCategories.sort((a, b) => a.order - b.order);
  firstCategories.sort((a, b) => a.order - b.order);

  return (
    <PageLayout
      title="Record categories"
      description="Active: the best performance is the World Record. Unchallenged: one achievement nobody has equalled or beaten yet, not a World Record; an approved claim that equals or beats it makes the category Active automatically. Archived: no new claims; the best performance is a Historical World Record."
    >
      <AdminNav current="/admin/records-categories" />
      <section className="p-4 sm:p-0">
        <CategoriesEditor recordCategories={recordCategories} firstCategories={firstCategories} />
      </section>
    </PageLayout>
  );
}
