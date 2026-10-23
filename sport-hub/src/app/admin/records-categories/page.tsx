import type { Metadata } from 'next';
import Link from 'next/link';
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
      description="Active: challenged and listed. Unchallenged: listed, but no one has seriously challenged it yet. Archived: no longer offered on the claim form, existing records stay visible."
    >
      <section className="p-4 sm:p-0">
        <Link href="/admin/records-review" className="text-blue-600 hover:underline text-sm">Back to the review queue</Link>
      </section>
      <section className="p-4 sm:p-0">
        <CategoriesEditor recordCategories={recordCategories} firstCategories={firstCategories} />
      </section>
    </PageLayout>
  );
}
