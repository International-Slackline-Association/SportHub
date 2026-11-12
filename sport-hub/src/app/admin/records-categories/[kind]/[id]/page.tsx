import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Button from '@ui/Button';
import PageLayout from '@ui/PageLayout';
import { requireRecordManager } from '@lib/authorization';
import { getCategoryAuditLog, getEntriesByCategory, getFirstCategory, getRecordCategory } from '@lib/records-service';
import { formatDate } from '@utils/dates';
import DeleteCategoryButton from '../../components/DeleteCategoryButton';
import FirstCategoryForm from '../../components/FirstCategoryForm';
import RecordCategoryForm from '../../components/RecordCategoryForm';
import { statusLabel } from '../../components/statusOptions';

export const metadata: Metadata = {
  title: 'SportHub - Record Category',
};

type Props = { params: Promise<{ kind: string; id: string }> };

const BackToList = () => (
  <section className="p-4 sm:p-0">
    <Button as="link" href="/admin/records-categories" variant="secondary" size="small">Back to all categories</Button>
  </section>
);

/** Details of one record category or first discipline: modify, history and delete. "new" creates one. */
export default async function CategoryPage({ params }: Props) {
  await requireRecordManager();
  const { kind, id } = await params;
  if (kind !== 'record' && kind !== 'first') notFound();
  const categoryId = decodeURIComponent(id);

  if (categoryId === 'new') {
    return (
      <PageLayout title={kind === 'record' ? 'New record category' : 'New first discipline'}>
        <BackToList />
        <section className="p-4 sm:p-0">
          {kind === 'record' ? <RecordCategoryForm /> : <FirstCategoryForm />}
        </section>
      </PageLayout>
    );
  }

  const pk = kind === 'record' ? 'RecordCategory' : 'FirstCategory';
  const [recordCategory, firstCategory, entries, audit] = await Promise.all([
    kind === 'record' ? getRecordCategory(categoryId) : null,
    kind === 'first' ? getFirstCategory(categoryId) : null,
    kind === 'record' ? getEntriesByCategory('record', categoryId) : getEntriesByCategory('first', categoryId),
    getCategoryAuditLog(pk, categoryId),
  ]);
  const category = recordCategory ?? firstCategory;
  if (!category) notFound();
  audit.sort((a, b) => b.at - a.at);
  const entryCount = entries.length;
  const entriesText = entryCount === 1 ? '1 record or claim' : `${entryCount} records or claims`;

  return (
    <PageLayout
      title={kind === 'record' ? `Record category: ${category.name}` : `First discipline: ${category.name}`}
      description={`Status: ${statusLabel(category.status)} · ${entriesText} · id ${category.categoryId}`}
    >
      <BackToList />

      <section className="p-4 sm:p-0 grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="stack gap-3">
          <h3 className="text-lg font-semibold">Details</h3>
          {recordCategory ? <RecordCategoryForm category={recordCategory} /> : firstCategory && <FirstCategoryForm category={firstCategory} />}
        </div>

        <div className="stack gap-6">
          <div className="stack gap-2">
            <h3 className="text-lg font-semibold">History</h3>
            {audit.length === 0 ? <p className="text-sm text-gray-500">No changes logged.</p> : (
              <ul className="text-sm stack gap-1">
                {audit.map(a => (
                  <li key={a.sortKey}>
                    <span className="text-gray-500">{formatDate(new Date(a.at))}</span>{' '}
                    <strong>{a.action.replace(/_/g, ' ')}</strong>{a.byName && ` by ${a.byName}`}{a.comment && `: ${a.comment}`}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="stack gap-2">
            <h3 className="text-lg font-semibold">Delete</h3>
            {entryCount > 0 ? (
              <p className="text-sm text-gray-600">
                This {kind === 'record' ? 'category' : 'discipline'} has {entriesText}, so it can&apos;t be deleted. Set its status to Archived to close it for new claims.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600">No record or claim uses this {kind === 'record' ? 'category' : 'discipline'}, so it can be deleted.</p>
                <DeleteCategoryButton pk={pk} categoryId={category.categoryId} name={category.name} />
              </>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
